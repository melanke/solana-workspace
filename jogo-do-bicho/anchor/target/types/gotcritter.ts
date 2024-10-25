/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/gotcritter.json`.
 */
export type Gotcritter = {
  "address": "GsxEDNRJbGhMADyosnm9R2HW6tL4VS2vrpwVhBZkFQaV",
  "metadata": {
    "name": "gotcritter",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Created with Anchor"
  },
  "instructions": [
    {
      "name": "claimPrize",
      "discriminator": [
        157,
        233,
        139,
        121,
        246,
        62,
        234,
        235
      ],
      "accounts": [
        {
          "name": "game",
          "writable": true
        },
        {
          "name": "bettor",
          "writable": true,
          "signer": true
        },
        {
          "name": "bet",
          "writable": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "createGame",
      "discriminator": [
        124,
        69,
        75,
        66,
        184,
        220,
        72,
        206
      ],
      "accounts": [
        {
          "name": "game",
          "writable": true,
          "signer": true
        },
        {
          "name": "creator",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "bettingPeriodSlots",
          "type": "u64"
        },
        {
          "name": "participants",
          "type": {
            "option": {
              "vec": "pubkey"
            }
          }
        }
      ]
    },
    {
      "name": "drawnNumber",
      "discriminator": [
        208,
        136,
        37,
        152,
        108,
        91,
        216,
        8
      ],
      "accounts": [
        {
          "name": "game"
        }
      ],
      "args": [],
      "returns": "u8"
    },
    {
      "name": "placeBet",
      "discriminator": [
        222,
        62,
        67,
        220,
        63,
        166,
        126,
        33
      ],
      "accounts": [
        {
          "name": "game",
          "writable": true
        },
        {
          "name": "bettor",
          "writable": true,
          "signer": true
        },
        {
          "name": "bet",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  98,
                  101,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "game"
              },
              {
                "kind": "account",
                "path": "bettor"
              },
              {
                "kind": "account",
                "path": "game.number_of_bets",
                "account": "game"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "recentBlockhashes",
          "address": "SysvarRecentB1ockHashes11111111111111111111"
        }
      ],
      "args": [
        {
          "name": "number",
          "type": "u8"
        },
        {
          "name": "value",
          "type": "u64"
        }
      ]
    },
    {
      "name": "prize",
      "discriminator": [
        159,
        138,
        208,
        216,
        159,
        194,
        21,
        78
      ],
      "accounts": [
        {
          "name": "game"
        },
        {
          "name": "bet"
        }
      ],
      "args": [],
      "returns": "u64"
    }
  ],
  "accounts": [
    {
      "name": "bet",
      "discriminator": [
        147,
        23,
        35,
        59,
        15,
        75,
        155,
        32
      ]
    },
    {
      "name": "game",
      "discriminator": [
        27,
        90,
        166,
        125,
        74,
        100,
        121,
        18
      ]
    }
  ],
  "events": [
    {
      "name": "betPlaced",
      "discriminator": [
        88,
        88,
        145,
        226,
        126,
        206,
        32,
        0
      ]
    },
    {
      "name": "endOfBettingPeriod",
      "discriminator": [
        190,
        50,
        129,
        243,
        123,
        152,
        72,
        14
      ]
    },
    {
      "name": "gameCreated",
      "discriminator": [
        218,
        25,
        150,
        94,
        177,
        112,
        96,
        2
      ]
    },
    {
      "name": "prizeClaimed",
      "discriminator": [
        213,
        150,
        192,
        76,
        199,
        33,
        212,
        38
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "gameClosed",
      "msg": "The game is closed for new participants"
    },
    {
      "code": 6001,
      "name": "invalidNumber",
      "msg": "Invalid number. Must be between 1 and 25"
    },
    {
      "code": 6002,
      "name": "bettingPeriodHasEnded",
      "msg": "The betting period has ended"
    },
    {
      "code": 6003,
      "name": "gameNotFinished",
      "msg": "The game has not finished yet"
    },
    {
      "code": 6004,
      "name": "invalidValue",
      "msg": "Invalid value. The minimum betting value is 0.001 SOL"
    },
    {
      "code": 6005,
      "name": "noPrize",
      "msg": "No prize for this bet"
    },
    {
      "code": 6006,
      "name": "betDoesNotBelongToBettor",
      "msg": "The bet does not belong to the bettor"
    },
    {
      "code": 6007,
      "name": "prizeAlreadyClaimed",
      "msg": "The prize for this bet has already been claimed"
    },
    {
      "code": 6008,
      "name": "insufficientBalance",
      "msg": "Sorry, something strange happened and we don't have enough balance to pay the prize"
    },
    {
      "code": 6009,
      "name": "invalidCreator",
      "msg": "Invalid creator"
    },
    {
      "code": 6010,
      "name": "betDoesNotBelongToGame",
      "msg": "A aposta não pertence a este jogo"
    }
  ],
  "types": [
    {
      "name": "bet",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "game",
            "type": "pubkey"
          },
          {
            "name": "bettor",
            "type": "pubkey"
          },
          {
            "name": "value",
            "type": "u64"
          },
          {
            "name": "number",
            "type": "u8"
          },
          {
            "name": "prizeClaimed",
            "type": "bool"
          }
        ]
      }
    },
    {
      "name": "betPlaced",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "game",
            "type": "pubkey"
          },
          {
            "name": "bettor",
            "type": "pubkey"
          },
          {
            "name": "number",
            "type": "u8"
          },
          {
            "name": "value",
            "type": "u64"
          },
          {
            "name": "timestamp",
            "type": "i64"
          },
          {
            "name": "bet",
            "type": "pubkey"
          }
        ]
      }
    },
    {
      "name": "endOfBettingPeriod",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "game",
            "type": "pubkey"
          },
          {
            "name": "closer",
            "type": "pubkey"
          },
          {
            "name": "reward",
            "type": "u64"
          },
          {
            "name": "timestamp",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "game",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "creator",
            "type": "pubkey"
          },
          {
            "name": "participants",
            "type": {
              "vec": "pubkey"
            }
          },
          {
            "name": "totalValue",
            "type": "u64"
          },
          {
            "name": "minEndingSlot",
            "type": "u64"
          },
          {
            "name": "combinedHash",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "betsPerNumber",
            "type": {
              "array": [
                "u64",
                25
              ]
            }
          },
          {
            "name": "bettingPeriodEnded",
            "type": "bool"
          },
          {
            "name": "drawnNumberConfirmed",
            "type": {
              "option": "u8"
            }
          },
          {
            "name": "numberOfBets",
            "type": "u64"
          },
          {
            "name": "valueProvidedToWinners",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "gameCreated",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "game",
            "type": "pubkey"
          },
          {
            "name": "creator",
            "type": "pubkey"
          },
          {
            "name": "private",
            "type": "bool"
          },
          {
            "name": "timestamp",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "prizeClaimed",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "game",
            "type": "pubkey"
          },
          {
            "name": "bettor",
            "type": "pubkey"
          },
          {
            "name": "drawnNumber",
            "type": "u8"
          },
          {
            "name": "prizeValue",
            "type": "u64"
          },
          {
            "name": "timestamp",
            "type": "i64"
          }
        ]
      }
    }
  ]
};
