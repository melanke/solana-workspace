use anchor_lang::prelude::*;
use anchor_lang::solana_program::system_instruction;
use anchor_lang::solana_program::program::invoke;
use anchor_lang::solana_program::hash::{hash, Hash};
use anchor_lang::solana_program::sysvar::recent_blockhashes::RecentBlockhashes;
use hex;

declare_id!("GsxEDNRJbGhMADyosnm9R2HW6tL4VS2vrpwVhBZkFQaV");

const BETTING_PERIOD_BLOCKS: u64 = 100; // TODO: instead of using a hardcoded value, the game should have a parameter for the betting period in slots (and maybe we don't need initial_slots, only the ending_slots)

#[program]
pub mod gotcritter {
    use super::*;

    // Method to create a new game
    pub fn create_game(ctx: Context<CreateGame>, open: bool, participants: Option<Vec<Pubkey>>) -> Result<()> {
        // Initialize the game account with the provided data
        let game = &mut ctx.accounts.game;
        game.creator = *ctx.accounts.creator.key;
        game.open = open; // if the game is open it means anyone can join, otherwise only the participants can bet
        game.participants = participants.unwrap_or_default(); // participants are the ones that can bet on the not-open game
        game.total_value = 0; // total sum of the values of bets on the game
        game.initial_slots = Clock::get()?.slot; // the slot when the game was created
        game.last_blockhash = [0; 32]; // the blockhash of the last bet on the game, used to determine the betting period ending
        game.combined_hash = [0; 32]; // the combined hash of each blockhash of the bets on the game, used to calculate the drawn number
        game.bets_per_number = [0; 25]; // the count of bets on each number
        game.betting_period_ended = false; // if the betting period has ended, meaning no more bets can be placed and the prizes can be claimed
        game.drawn_number_cache = None; // the drawn number cache, used to avoid recalculating the drawn number
        game.number_of_bets = 0; // the number of bets on the game
        game.value_provided_to_winners = 0; // the sum of the values of the prizes claimed and paid to the winners

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
        // Check if the betting period is still open
        require!(!ctx.accounts.game.betting_period_ended, CustomError::BettingPeriodEnded);

        // Get the most recent blockhash
        let recent_blockhashes = RecentBlockhashes::from_account_info(&ctx.accounts.recent_blockhashes)?;
        let recent_blockhash = recent_blockhashes.get(0).ok_or(ProgramError::InvalidAccountData)?.blockhash;

        // if the blockhash changed
        if recent_blockhash != Hash::new_from_array(ctx.accounts.game.last_blockhash) {
            // theoretically, the if is unnecessary, it will be always true, since there will be only one bet per game per blockhash
            // (game is a mutable pda and only one transaction handling it can happen per block)

            // Update the combined hash adding the recent blockhash
            let mut combined = ctx.accounts.game.combined_hash.to_vec();
            combined.extend_from_slice(&recent_blockhash.to_bytes());
            ctx.accounts.game.combined_hash = hash(&combined).to_bytes();

            ctx.accounts.game.last_blockhash = recent_blockhash.to_bytes(); // Update the last blockhash // TODO: maybe this variable is not necessary, since we have the recent_blockhash
            ctx.accounts.game.betting_period_ended = ctx.accounts.game.calc_betting_period_ended()?; // Check if the betting period has ended and update the game account with this information

            // TODO: ⚠️ recent_blockhash is something known by the user before placing the bet,
            // so the bettor could use it to calculate the drawn number precisely the moment the betting period ends by his bet.
            // When the betting period ends we should accept his transaction to save the betting_period_ended,
            // but we should ignore his bet and pay him back a retribution for his service of closing the betting period
        }

        // Check if the game is open or if the bettor is in the participants list
        require!(ctx.accounts.game.open || ctx.accounts.game.participants.contains(ctx.accounts.bettor.key), CustomError::GameClosed);
        
        // Check if the bet number is valid
        require!(number >= 1 && number <= 25, CustomError::InvalidNumber);
        
        // Check if the bet value is valid (minimum of 0.01 SOL)
        require!(value >= 1_000_000, CustomError::InvalidValue);

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
        
        ctx.accounts.game.bets_per_number[(number - 1) as usize] += value; // Update the sum of bets for the chosen number
        ctx.accounts.game.total_value += value; // Update the total value of bets on the game
        ctx.accounts.game.number_of_bets += 1; // Update the number of bets on the game

        // Create the bet account
        let bet = &mut ctx.accounts.bet;
        bet.game = ctx.accounts.game.key(); // The game the bet belongs to
        bet.bettor = *ctx.accounts.bettor.key; // The bettor
        bet.value = value; // The value of the bet
        bet.number = number; // The number of the bet
        bet.blockhash = recent_blockhash.to_bytes(); // The blockhash of the bet // TODO: check if this is necessary

        // Emit an event informing that a bet was placed
        emit!(BetPlaced {
            game: ctx.accounts.game.key(),
            bettor: ctx.accounts.bettor.key(),
            number,
            value,
            timestamp: Clock::get()?.unix_timestamp,
            bet: bet.key(),
        });

        Ok(())
    }

    // Method to check the prize of a bet
    pub fn drawn_number(ctx: Context<CheckDrawnNumber>) -> Result<u8> {
        let game = &ctx.accounts.game;
        let drawn_number = game.calculate_drawn_number()?;        
        Ok(drawn_number)
    }

    // Method to check the prize of a bet
    pub fn prize(ctx: Context<CheckPrize>) -> Result<u64> {
        let game = &ctx.accounts.game;
        let bet = &ctx.accounts.bet;

        // Calculate the drawn number
        let drawn_number = game.calculate_drawn_number()?;

        // Calculate the prize
        let prize = game.calculate_prize(bet, drawn_number)?;
        
        Ok(prize)
    }

    // Method to claim the prize of a bet
    pub fn claim_prize(ctx: Context<ClaimPrize>) -> Result<()> {
        let game = &mut ctx.accounts.game;
        let bet = &ctx.accounts.bet;

        // Check if the betting period has ended
        require!(game.betting_period_ended, CustomError::GameNotFinished);

        // Check if the prize has already been claimed
        require!(!bet.prize_claimed, CustomError::PrizeAlreadyClaimed);        

        // Calculate the drawn number
        let drawn_number = game.calculate_drawn_number()?;

        // Calculate the prize
        let prize = game.calculate_prize(bet, drawn_number)?;

        // Check if there is a prize for the bet
        require!(prize > 0, CustomError::NoPrize);

        // Check if the game has enough balance to pay the prize, but theoretically the error should never happen
        let game_balance = game.to_account_info().lamports();
        require!(game_balance >= prize, CustomError::InsufficientBalance);

        // Transfer the prize to the bettor
        **game.to_account_info().try_borrow_mut_lamports()? -= prize;
        **ctx.accounts.bettor.to_account_info().try_borrow_mut_lamports()? += prize;

        // Update the total value provided to winners
        game.value_provided_to_winners += prize;

        // Emit an event informing that the prize was claimed
        emit!(PrizeClaimed {
            game: game.key(),
            bettor: ctx.accounts.bettor.key(),
            drawn_number,
            prize_value: prize,
            timestamp: Clock::get()?.unix_timestamp,
        });

        Ok(())
    }
}

#[derive(Accounts)]
pub struct CreateGame<'info> {
    // Initialize the game account with the creator (signer) as the payer
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
    // The game the bet is on. It will be updated with calculated values
    #[account(mut)]
    pub game: Account<'info, Game>,
    // The bettor
    #[account(mut)]
    pub bettor: Signer<'info>,
    // Initialize the bet account with the bettor as the payer
    #[account(
        init,
        payer = bettor,
        space = 8 + 32 + 8 + 1 + 32 + 32 + 1,
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
    /// CHECK: This account is not written in this instruction
    #[account(address = anchor_lang::solana_program::sysvar::recent_blockhashes::ID)]
    pub recent_blockhashes: AccountInfo<'info>,
}

#[derive(Accounts)]
pub struct CheckDrawnNumber<'info> {
    // The game to check the drawn number
    pub game: Account<'info, Game>,
}

#[derive(Accounts)]
pub struct CheckPrize<'info> {
    // The game the bet is on
    #[account(
        constraint = game.key() == bet.game @ CustomError::BetDoesNotBelongToGame
    )]
    pub game: Account<'info, Game>,
    // The bet to check the prize
    pub bet: Account<'info, Bet>,
}

#[derive(Accounts)]
pub struct ClaimPrize<'info> {
    // The game to claim the prize, mutable because we will deduce it's balance to pay the prize and we will update it
    #[account(mut)]
    pub game: Account<'info, Game>,
    // The bettor to receive the prize, mutable because we will add the prize to it's balance
    #[account(mut)]
    pub bettor: Signer<'info>,
    // The bet to claim the prize, mutable because we will close it
    #[account(
        mut,
        constraint = bet.bettor == bettor.key() @ CustomError::BetDoesNotBelongToBettor,
        constraint = bet.game == game.key() @ CustomError::BetDoesNotBelongToGame,
        close = bettor
    )]
    pub bet: Account<'info, Bet>,
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
    pub betting_period_ended: bool,
    pub drawn_number_cache: Option<u8>, // TODO: we could rename this to something like drawn_number_confirmed
    pub number_of_bets: u64,
    pub value_provided_to_winners: u64,
}

#[account]
#[derive(Default)]
pub struct Bet {
    pub game: Pubkey,
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
    #[msg("The game can't be closed yet, waiting for the prizes to be claimed")]
    CantCloseGame, // TODO: this is not used anymore and there is no way to close the game
    #[msg("Invalid value. The minimum betting value is 0.001 SOL")]
    InvalidValue,
    #[msg("No prize for this bet")]
    NoPrize,
    #[msg("The bet does not belong to the bettor")]
    BetDoesNotBelongToBettor,
    #[msg("The prize for this bet has already been claimed")]
    PrizeAlreadyClaimed,
    #[msg("Sorry, something strange happened and we don't have enough balance to pay the prize")]
    InsufficientBalance,
    #[msg("Invalid creator")]
    InvalidCreator,
    #[msg("A aposta não pertence a este jogo")]
    BetDoesNotBelongToGame,
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
    // TODO: maybe we don't need this method, we could use this code directly in the place_bet method
    pub fn calc_betting_period_ended(&self) -> Result<bool> {
        let last_blockhash_str = hex::encode(self.last_blockhash); // Convert the last blockhash to hexadecimal string
        let last_digits = &last_blockhash_str[last_blockhash_str.len()-2..]; // Get the last two digits
        Ok(Clock::get()?.slot >= self.initial_slots + BETTING_PERIOD_BLOCKS && last_digits.chars().nth(0) == last_digits.chars().nth(1)) // Check if the betting period has ended
    }

    pub fn calculate_drawn_number(&self) -> Result<u8> {
        let drawn_number = if let Some(cache) = self.drawn_number_cache {
            cache // uses the cached drawn number if it exists
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
        let total_bet_on_number = self.bets_per_number[(drawn_number - 1) as usize]; // the total value of bets on the drawn number

        let prize = if total_bet_on_number <= 0 || bet.number != drawn_number {
            0 // no prize if there is no bet on the drawn number or the bet is not on the drawn number
        } else {            
            // Use u128 for intermediate calculation to avoid overflow
            let intermediate_result = (self.total_value as u128) * (bet.value as u128) / (total_bet_on_number as u128);
            
            // Convert back to u64, capping at u64::MAX if necessary
            intermediate_result.min(u64::MAX as u128) as u64 // this is safe because the max value of u64 in lamports is way more than sol's total supply
        };

        Ok(prize)
    }
}
