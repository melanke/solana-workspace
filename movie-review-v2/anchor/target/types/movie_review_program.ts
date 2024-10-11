/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/movie_review_program.json`.
 */
export type MovieReviewProgram = {
  "address": "2rDaKa9MrQcCEMQRTV64sMxUdfSVYGo6sLw4gwfvS9Qg",
  "metadata": {
    "name": "movieReviewProgram",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Created with Anchor"
  },
  "instructions": [
    {
      "name": "addMovieReview",
      "discriminator": [
        82,
        218,
        40,
        213,
        242,
        141,
        142,
        57
      ],
      "accounts": [
        {
          "name": "movieReview",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "arg",
                "path": "title"
              },
              {
                "kind": "account",
                "path": "initializer"
              }
            ]
          }
        },
        {
          "name": "initializer",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "mint",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  105,
                  110,
                  116
                ]
              }
            ]
          }
        },
        {
          "name": "tokenAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "initializer"
              },
              {
                "kind": "const",
                "value": [
                  6,
                  221,
                  246,
                  225,
                  215,
                  101,
                  161,
                  147,
                  217,
                  203,
                  225,
                  70,
                  206,
                  235,
                  121,
                  172,
                  28,
                  180,
                  133,
                  237,
                  95,
                  91,
                  55,
                  145,
                  58,
                  140,
                  245,
                  133,
                  126,
                  255,
                  0,
                  169
                ]
              },
              {
                "kind": "account",
                "path": "mint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "associatedTokenProgram",
          "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
        }
      ],
      "args": [
        {
          "name": "title",
          "type": "string"
        },
        {
          "name": "description",
          "type": "string"
        },
        {
          "name": "rating",
          "type": "u8"
        }
      ]
    },
    {
      "name": "deleteMovieReview",
      "discriminator": [
        145,
        87,
        218,
        149,
        170,
        123,
        217,
        101
      ],
      "accounts": [
        {
          "name": "movieReview",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "arg",
                "path": "title"
              },
              {
                "kind": "account",
                "path": "initializer"
              }
            ]
          }
        },
        {
          "name": "initializer",
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
          "name": "title",
          "type": "string"
        }
      ]
    },
    {
      "name": "initializeTokenMint",
      "discriminator": [
        243,
        98,
        101,
        152,
        121,
        91,
        174,
        93
      ],
      "accounts": [
        {
          "name": "mint",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  105,
                  110,
                  116
                ]
              }
            ]
          }
        },
        {
          "name": "user",
          "writable": true,
          "signer": true
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "rent",
          "address": "SysvarRent111111111111111111111111111111111"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "updateMovieReview",
      "discriminator": [
        249,
        116,
        24,
        72,
        122,
        80,
        243,
        89
      ],
      "accounts": [
        {
          "name": "movieReview",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "arg",
                "path": "title"
              },
              {
                "kind": "account",
                "path": "initializer"
              }
            ]
          }
        },
        {
          "name": "initializer",
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
          "name": "title",
          "type": "string"
        },
        {
          "name": "description",
          "type": "string"
        },
        {
          "name": "rating",
          "type": "u8"
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "movieAccountState",
      "discriminator": [
        103,
        146,
        32,
        212,
        187,
        166,
        40,
        13
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "invalidRating",
      "msg": "Rating must be between 1 and 5"
    },
    {
      "code": 6001,
      "name": "titleTooLong",
      "msg": "Title must be less than 20 characters"
    },
    {
      "code": 6002,
      "name": "descriptionTooLong",
      "msg": "Description must be less than 50 characters"
    }
  ],
  "types": [
    {
      "name": "movieAccountState",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "reviewer",
            "type": "pubkey"
          },
          {
            "name": "rating",
            "type": "u8"
          },
          {
            "name": "title",
            "type": "string"
          },
          {
            "name": "description",
            "type": "string"
          }
        ]
      }
    }
  ]
};
