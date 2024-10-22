use anchor_lang::prelude::*;
use anchor_lang::solana_program::system_instruction;
use anchor_lang::solana_program::program::invoke;
use anchor_lang::solana_program::hash::{hash, Hash};
use anchor_lang::solana_program::sysvar::recent_blockhashes::RecentBlockhashes;
use hex;

declare_id!("GsxEDNRJbGhMADyosnm9R2HW6tL4VS2vrpwVhBZkFQaV");

#[program]
pub mod gotcritter {
    use super::*;

    // Method to create a new game
    pub fn create_game(ctx: Context<CreateGame>, open: bool, participants: Option<Vec<Pubkey>>) -> Result<()> {
        // Initialize the game account with the provided data
        let game = &mut ctx.accounts.game;
        game.creator = *ctx.accounts.creator.key;
        game.open = open;
        game.participants = participants.unwrap_or_default();
        game.total_value = 0;
        game.initial_slots = Clock::get()?.slot;
        game.last_blockhash = [0; 32];
        game.combined_hash = [0; 32];
        game.bets_per_number = [0; 25];
        game.betting_period_ended_cache = None;
        game.drawn_number_cache = None;
        game.number_of_bets = 0;
        game.value_provided_to_winners = 0;

        // Emit an event informing that a new game was created
        emit!(GameCreated {
            game: ctx.accounts.game.key(),
            creator: ctx.accounts.creator.key(),
            open,
            timestamp: Clock::get()?.unix_timestamp,
        });

        Ok(())
    }

    // Method to place a bet
    pub fn place_bet(ctx: Context<PlaceBet>, number: u8, value: u64) -> Result<()> {
        // Obtenha o blockhash mais recente
        let recent_blockhashes = RecentBlockhashes::from_account_info(&ctx.accounts.recent_blockhashes)?;
        let recent_blockhash = recent_blockhashes.get(0).ok_or(ProgramError::InvalidAccountData)?.blockhash;

        // Update the combined hash if the blockhash changed
        if recent_blockhash != Hash::new_from_array(ctx.accounts.game.last_blockhash) {
            let mut combined = ctx.accounts.game.combined_hash.to_vec();
            combined.extend_from_slice(&recent_blockhash.to_bytes());
            ctx.accounts.game.combined_hash = hash(&combined).to_bytes();
            ctx.accounts.game.last_blockhash = recent_blockhash.to_bytes();
        }

        // Check if the game is open or if the bettor is in the participants list
        require!(ctx.accounts.game.open || ctx.accounts.game.participants.contains(ctx.accounts.bettor.key), CustomError::GameClosed);
        
        // Check if the bet number is valid
        require!(number >= 1 && number <= 25, CustomError::InvalidNumber);
        
        // Check if the bet value is valid (minimum of 0.01 SOL)
        require!(value >= 1_000_000, CustomError::InvalidValue);

        // Check if the betting period is still open
        require!(!ctx.accounts.game.betting_period_ended()?, CustomError::BettingPeriodEnded);

        // Transfer the bet value from the bettor to the game account
        let transfer_instruction = system_instruction::transfer(
            ctx.accounts.bettor.key,
            ctx.accounts.game.to_account_info().key,
            value,
        );

        invoke(
            &transfer_instruction,
            &[
                ctx.accounts.bettor.to_account_info(),
                ctx.accounts.game.to_account_info(),
                ctx.accounts.system_program.to_account_info(),
            ],
        )?;

        // Update the sum of bets for the chosen number
        ctx.accounts.game.bets_per_number[(number - 1) as usize] += value;
        ctx.accounts.game.total_value += value;
        ctx.accounts.game.number_of_bets += 1;

        // Create the bet account
        let bet = &mut ctx.accounts.bet;
        bet.bettor = *ctx.accounts.bettor.key;
        bet.value = value;
        bet.number = number;
        bet.blockhash = recent_blockhash.to_bytes();

        // Emit an event informing that a bet was placed
        emit!(BetPlaced {
            game: ctx.accounts.game.key(),
            bettor: ctx.accounts.bettor.key(),
            number,
            value,
            timestamp: Clock::get()?.unix_timestamp,
            bet: ctx.accounts.bet.key(),
        });

        Ok(())
    }

    // Method to check the prize of a bet
    pub fn drawn_number(ctx: Context<CheckDrawnNumber>) -> Result<u8> {
        let game = &ctx.accounts.game;

        // Calcula o prêmio
        let drawn_number = game.calculate_drawn_number()?;
        
        Ok(drawn_number)
    }

    // Method to check the prize of a bet
    pub fn prize(ctx: Context<CheckPrize>) -> Result<u64> {
        let game = &ctx.accounts.game;
        let bet = &ctx.accounts.bet;

        // Calcula o número sorteado
        let drawn_number = game.calculate_drawn_number()?;

        // Calcula o prêmio
        let prize = game.calculate_prize(bet, drawn_number)?;
        
        Ok(prize)
    }

    // Method to check the prize of a bet
    pub fn is_betting_period_ended(ctx: Context<IsBettingPeriodEnded>) -> Result<bool> {
        let game = &ctx.accounts.game;
        
        // Verifica se o período de apostas terminou
        let betting_period_ended = game.betting_period_ended()?;
        
        Ok(betting_period_ended)
    }

    // Method to claim the prize of a bet
    pub fn claim_prize(ctx: Context<ClaimPrize>) -> Result<()> {
        // Check if the betting period has ended
        require!(ctx.accounts.game.betting_period_ended()?, CustomError::GameNotFinished);
        
        // Check if the prize has already been claimed
        require!(!ctx.accounts.bet.prize_claimed, CustomError::PrizeAlreadyClaimed);

        // Calculate the prize
        let drawn_number = ctx.accounts.game.calculate_drawn_number()?;
        let prize = ctx.accounts.game.calculate_prize(&ctx.accounts.bet, drawn_number)?;

        if prize > 0 {
            // Check if the game has enough balance to pay the prize
            let game_balance = ctx.accounts.game.to_account_info().lamports();
            require!(game_balance >= prize, CustomError::InsufficientBalance);

            // Transfer the prize to the bettor
            let transfer_instruction = system_instruction::transfer(
                ctx.accounts.game.to_account_info().key,
                ctx.accounts.bettor.key,
                prize,
            );

            invoke(
                &transfer_instruction,
                &[
                    ctx.accounts.game.to_account_info(),
                    ctx.accounts.bettor.to_account_info(),
                    ctx.accounts.system_program.to_account_info(),
                ],
            )?;

            // Mark the prize as claimed
            ctx.accounts.bet.prize_claimed = true;

            // Update the total value provided to winners
            ctx.accounts.game.value_provided_to_winners += prize;

            // Check if all prizes have been paid
            if ctx.accounts.game.value_provided_to_winners == ctx.accounts.game.total_value {
                // Emit an event informing that the game has ended
                emit!(GameEnded {
                    game: ctx.accounts.game.key(),
                    creator: ctx.accounts.creator.key(),
                    total_value: ctx.accounts.game.total_value,
                    timestamp: Clock::get()?.unix_timestamp,
                });
            }

            // Update the game caches
            ctx.accounts.game.betting_period_ended_cache = Some(true);
            ctx.accounts.game.drawn_number_cache = Some(drawn_number);

            // Emit an event informing that the prize was claimed
            emit!(PrizeClaimed {
                game: ctx.accounts.game.key(),
                bettor: ctx.accounts.bettor.key(),
                drawn_number,
                prize_value: prize,
                timestamp: Clock::get()?.unix_timestamp,
            });
        } else {
            return Err(CustomError::NoPrize.into());
        }

        Ok(())
    }
}

#[derive(Accounts)]
pub struct CreateGame<'info> {
    #[account(
        init,
        payer = creator,
        space = 8 + 32 + 1 + 32 * 10 + 8 + 8 + 32 + 32 + 200 + 1 + 1 + 8 + 8
    )]
    pub game: Account<'info, Game>,
    #[account(mut)]
    pub creator: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct PlaceBet<'info> {
    #[account(mut)]
    pub game: Account<'info, Game>,
    #[account(mut)]
    pub bettor: Signer<'info>,
    #[account(
        init,
        payer = bettor,
        space = 8 + 32 + 8 + 1 + 32 + 1,
        seeds = [
            b"bet",
            game.key().as_ref(),
            bettor.key().as_ref(),
            &game.number_of_bets.to_le_bytes()
        ],
        bump
    )]
    pub bet: Account<'info, Bet>,
    pub system_program: Program<'info, System>,
    /// CHECK: This account is not read or written in this instruction
    #[account(address = anchor_lang::solana_program::sysvar::recent_blockhashes::ID)]
    pub recent_blockhashes: AccountInfo<'info>,
}

#[derive(Accounts)]
pub struct CheckDrawnNumber<'info> {
    pub game: Account<'info, Game>,
}

#[derive(Accounts)]
pub struct CheckPrize<'info> {
    pub game: Account<'info, Game>,
    pub bet: Account<'info, Bet>,
}

#[derive(Accounts)]
pub struct IsBettingPeriodEnded<'info> {
    pub game: Account<'info, Game>,
}

#[derive(Accounts)]
pub struct ClaimPrize<'info> {
    #[account(
        mut,
        close = creator,
        has_one = creator @ CustomError::InvalidCreator,
        constraint = game.value_provided_to_winners == game.total_value @ CustomError::GameNotFinished
    )]
    pub game: Account<'info, Game>,
    #[account(mut)]
    pub bettor: Signer<'info>,
    #[account(
        mut,
        constraint = bet.bettor == *bettor.key @ CustomError::BetDoesNotBelongToBettor
    )]
    pub bet: Account<'info, Bet>,
    #[account(mut)]
    /// CHECK: Este é o criador do jogo, verificado pela constraint has_one no account game
    pub creator: AccountInfo<'info>,
    pub system_program: Program<'info, System>,
}

#[account]
pub struct Game {
    pub creator: Pubkey,
    pub open: bool,
    pub participants: Vec<Pubkey>,
    pub total_value: u64,
    pub initial_slots: u64,
    pub last_blockhash: [u8; 32],
    pub combined_hash: [u8; 32],
    pub bets_per_number: [u64; 25],
    pub betting_period_ended_cache: Option<bool>,
    pub drawn_number_cache: Option<u8>,
    pub number_of_bets: u64,
    pub value_provided_to_winners: u64,
}

#[account]
#[derive(Default)]
pub struct Bet {
    pub bettor: Pubkey,
    pub value: u64,
    pub number: u8,
    pub blockhash: [u8; 32],
    pub prize_claimed: bool,
}

#[error_code]
pub enum CustomError {
    #[msg("The game is closed for new participants")]
    GameClosed,
    #[msg("Invalid number. Must be between 1 and 25")]
    InvalidNumber,
    #[msg("The betting period has ended")]
    BettingPeriodEnded,
    #[msg("The game has not finished yet")]
    GameNotFinished,
    #[msg("Invalid value. The minimum betting value is 0.001 SOL")]
    InvalidValue,
    #[msg("No prize for this bet")]
    NoPrize,
    #[msg("The bet does not belong to the bettor")]
    BetDoesNotBelongToBettor,
    #[msg("The prize for this bet has already been claimed")]
    PrizeAlreadyClaimed,
    #[msg("Insufficient balance to pay the prize")]
    InsufficientBalance,
    #[msg("Invalid creator")]
    InvalidCreator,
}

#[event]
pub struct GameCreated {
    pub game: Pubkey,
    pub creator: Pubkey,
    pub open: bool,
    pub timestamp: i64,
}

#[event]
pub struct BetPlaced {
    pub game: Pubkey,
    pub bettor: Pubkey,
    pub number: u8,
    pub value: u64,
    pub timestamp: i64,
    pub bet: Pubkey,
}

#[event]
pub struct PrizeClaimed {
    pub game: Pubkey,
    pub bettor: Pubkey,
    pub drawn_number: u8,
    pub prize_value: u64,
    pub timestamp: i64,
}

#[event]
pub struct GameEnded {
    pub game: Pubkey,
    pub creator: Pubkey,
    pub total_value: u64,
    pub timestamp: i64,
}

impl Game {
    pub fn betting_period_ended(&self) -> Result<bool> {
        // Check if the result is cached
        if let Some(cache) = self.betting_period_ended_cache {
            return Ok(cache);
        }

        // Convert the last blockhash to hexadecimal string
        let last_blockhash_str = hex::encode(self.last_blockhash);
        // Get the last two digits
        let last_digits = &last_blockhash_str[last_blockhash_str.len()-2..];
        // Check if 1000 blocks have passed since the start and if the last two digits are equal
        Ok(Clock::get()?.slot >= self.initial_slots + 1000 && last_digits.chars().nth(0) == last_digits.chars().nth(1))
    }

    pub fn calculate_drawn_number(&self) -> Result<u8> {
        // Check if the drawn number is cached
        let drawn_number = if let Some(cache) = self.drawn_number_cache {
            cache
        } else {
            // Calculate the drawn number using the combined hash
            let mut sum: u64 = 0;
            for chunk in self.combined_hash.chunks(8) {
                sum = sum.wrapping_add(u64::from_le_bytes(chunk.try_into().unwrap_or([0; 8])));
            }
            ((sum % 25) + 1) as u8
        };

        Ok(drawn_number)
    }

    pub fn calculate_prize(&self, bet: &Bet, drawn_number: u8) -> Result<u64> {
        // Calculate the prize
        let total_bet_on_number = self.bets_per_number[(drawn_number - 1) as usize];
        let prize = if total_bet_on_number > 0 && bet.number == drawn_number {
            (self.total_value * bet.value) / total_bet_on_number
        } else {
            0
        };

        Ok(prize)
    }
}
