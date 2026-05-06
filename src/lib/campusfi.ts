/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/campusfi.json`.
 */
export type Campusfi = {
  "address": "GdDRw2Z8wmnVndyNCDndk3AubLp8vrErAtqMFcBri8Nt",
  "metadata": {
    "name": "campusfi",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "CampusFi reputation-based student loan protocol"
  },
  "docs": [
    "CampusFi — Reputation-Based Student Loan Protocol on Solana",
    "",
    "Program accounts (all PDAs):",
    "- StudentProfile: [\"student\", wallet]",
    "- LoanRequest: [\"loan\", student, loan_id]",
    "- LoanFunding: [\"funding\", loan, lender]",
    "- ProtocolConfig: [\"config\"]",
    "",
    "Currency: USDC (6 decimals) primary, SOL secondary"
  ],
  "instructions": [
    {
      "name": "createLoanRequest",
      "docs": [
        "Create a loan request"
      ],
      "discriminator": [
        98,
        217,
        110,
        114,
        5,
        69,
        35,
        204
      ],
      "accounts": [
        {
          "name": "loanRequest",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  108,
                  111,
                  97,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "authority"
              },
              {
                "kind": "arg",
                "path": "loanId"
              }
            ]
          }
        },
        {
          "name": "studentProfile",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  116,
                  117,
                  100,
                  101,
                  110,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "authority"
              }
            ]
          }
        },
        {
          "name": "authority",
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
          "name": "loanId",
          "type": "u64"
        },
        {
          "name": "amount",
          "type": "u64"
        },
        {
          "name": "purpose",
          "type": "string"
        },
        {
          "name": "termMonths",
          "type": "u8"
        },
        {
          "name": "interestRateBps",
          "type": "u16"
        }
      ]
    },
    {
      "name": "fundLoan",
      "docs": [
        "Fund a loan (lender sends USDC to vault)"
      ],
      "discriminator": [
        50,
        221,
        51,
        13,
        3,
        142,
        116,
        215
      ],
      "accounts": [
        {
          "name": "loanFunding",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  102,
                  117,
                  110,
                  100,
                  105,
                  110,
                  103
                ]
              },
              {
                "kind": "account",
                "path": "loanRequest"
              },
              {
                "kind": "account",
                "path": "lender"
              }
            ]
          }
        },
        {
          "name": "loanRequest",
          "writable": true
        },
        {
          "name": "lenderTokenAccount",
          "writable": true
        },
        {
          "name": "vaultTokenAccount",
          "writable": true
        },
        {
          "name": "lender",
          "writable": true,
          "signer": true
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "initializeConfig",
      "docs": [
        "Initialize protocol configuration (admin-only, once)"
      ],
      "discriminator": [
        208,
        127,
        21,
        1,
        194,
        190,
        196,
        70
      ],
      "accounts": [
        {
          "name": "config",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "admin",
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
          "name": "reserveBps",
          "type": "u16"
        },
        {
          "name": "minReputation",
          "type": "u16"
        }
      ]
    },
    {
      "name": "registerStudent",
      "docs": [
        "Register a new student profile"
      ],
      "discriminator": [
        108,
        126,
        219,
        150,
        153,
        225,
        102,
        92
      ],
      "accounts": [
        {
          "name": "studentProfile",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  116,
                  117,
                  100,
                  101,
                  110,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "authority"
              }
            ]
          }
        },
        {
          "name": "authority",
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
          "name": "name",
          "type": "string"
        },
        {
          "name": "university",
          "type": "string"
        }
      ]
    },
    {
      "name": "repayInstallment",
      "docs": [
        "Repay a loan installment (student sends USDC)"
      ],
      "discriminator": [
        113,
        130,
        233,
        104,
        65,
        2,
        233,
        21
      ],
      "accounts": [
        {
          "name": "loanRequest",
          "writable": true
        },
        {
          "name": "studentTokenAccount",
          "writable": true
        },
        {
          "name": "vaultTokenAccount",
          "writable": true
        },
        {
          "name": "student",
          "writable": true,
          "signer": true
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "updateReputation",
      "docs": [
        "Update student reputation score (admin-only)"
      ],
      "discriminator": [
        194,
        220,
        43,
        201,
        54,
        209,
        49,
        178
      ],
      "accounts": [
        {
          "name": "studentProfile",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  116,
                  117,
                  100,
                  101,
                  110,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "student_profile.authority",
                "account": "studentProfile"
              }
            ]
          }
        },
        {
          "name": "config",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "admin",
          "signer": true
        }
      ],
      "args": [
        {
          "name": "newScore",
          "type": "u16"
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "loanFunding",
      "discriminator": [
        249,
        231,
        165,
        162,
        149,
        61,
        160,
        120
      ]
    },
    {
      "name": "loanRequest",
      "discriminator": [
        244,
        184,
        133,
        50,
        20,
        37,
        31,
        209
      ]
    },
    {
      "name": "protocolConfig",
      "discriminator": [
        207,
        91,
        250,
        28,
        152,
        179,
        215,
        209
      ]
    },
    {
      "name": "studentProfile",
      "discriminator": [
        185,
        172,
        160,
        26,
        178,
        113,
        216,
        235
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "profileExists",
      "msg": "Student profile already exists"
    },
    {
      "code": 6001,
      "name": "unauthorized",
      "msg": "unauthorized"
    },
    {
      "code": 6002,
      "name": "loanNotFundable",
      "msg": "Loan request is not in a fundable state"
    },
    {
      "code": 6003,
      "name": "insufficientReputation",
      "msg": "Insufficient reputation score"
    },
    {
      "code": 6004,
      "name": "invalidAmount",
      "msg": "Amount must be between $50 and $300 USDC"
    },
    {
      "code": 6005,
      "name": "loanNotRepayable",
      "msg": "Loan is not in repayable state"
    },
    {
      "code": 6006,
      "name": "overpayment",
      "msg": "Overpayment exceeds remaining balance"
    },
    {
      "code": 6007,
      "name": "overFunding",
      "msg": "Over-funding exceeds loan amount"
    },
    {
      "code": 6008,
      "name": "nameTooLong",
      "msg": "Name too long (max 64 chars)"
    },
    {
      "code": 6009,
      "name": "universityTooLong",
      "msg": "University name too long (max 64 chars)"
    },
    {
      "code": 6010,
      "name": "purposeTooLong",
      "msg": "Purpose description too long (max 128 chars)"
    },
    {
      "code": 6011,
      "name": "invalidTerm",
      "msg": "Invalid term (must be 1-6 months)"
    },
    {
      "code": 6012,
      "name": "invalidInterestRate",
      "msg": "Invalid interest rate (max 4%/month)"
    },
    {
      "code": 6013,
      "name": "invalidReputationScore",
      "msg": "Invalid reputation score (max 1000)"
    }
  ],
  "types": [
    {
      "name": "loanFunding",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "lender",
            "type": "pubkey"
          },
          {
            "name": "loanRequest",
            "type": "pubkey"
          },
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "fundedAt",
            "type": "i64"
          },
          {
            "name": "returnsClaimed",
            "type": "u64"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "loanRequest",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "student",
            "type": "pubkey"
          },
          {
            "name": "loanId",
            "type": "u64"
          },
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "fundedAmount",
            "type": "u64"
          },
          {
            "name": "purpose",
            "type": "string"
          },
          {
            "name": "termMonths",
            "type": "u8"
          },
          {
            "name": "interestRateBps",
            "type": "u16"
          },
          {
            "name": "status",
            "type": "u8"
          },
          {
            "name": "riskTier",
            "type": "u8"
          },
          {
            "name": "repaidAmount",
            "type": "u64"
          },
          {
            "name": "createdAt",
            "type": "i64"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "protocolConfig",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "admin",
            "type": "pubkey"
          },
          {
            "name": "reserveBps",
            "type": "u16"
          },
          {
            "name": "minReputation",
            "type": "u16"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "studentProfile",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "authority",
            "type": "pubkey"
          },
          {
            "name": "name",
            "type": "string"
          },
          {
            "name": "university",
            "type": "string"
          },
          {
            "name": "reputationScore",
            "type": "u16"
          },
          {
            "name": "loansCount",
            "type": "u8"
          },
          {
            "name": "identityVerified",
            "type": "bool"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    }
  ]
};
