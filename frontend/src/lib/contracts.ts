/**
 * ContagionStop — contract ABIs + deployment addresses (LIVE).
 *
 * Kontrak TER-DEPLOY di testnet 14 Nov 2026 — alamat di bawah ini adalah
 * alamat NYATA (lihat README.md / VERIFICATION.md). `LIVE` = true.
 * Tampilkan alamat ini di UI; tautkan ke explorer masing-masing.
 *
 * ABI di bawah ini diekstrak langsung dari repo kontrak (read-only) via:
 *   forge inspect SiblingVault abi --json
 *   forge inspect ContagionWatcher abi --json
 * Repo: <repo kontrak ContagionStop> (src/SiblingVault.sol, src/ContagionWatcher.sol).
 * JANGAN edit ABI dengan tangan — regenerate dari repo bila kontrak berubah.
 *
 * PERBEDAAN PENTING vs spesifikasi awal (ux-ui-notes.md) — baca sebelum memakai:
 *  1. SiblingVault TIDAK PUNYA `balance()`. Saldo ETH dibaca via `eth_getBalance`
 *     (wagmi `useBalance`), dan total deposit tercatat via `totalDeposited()`.
 *  2. SiblingVault `pause()` BUKAN tanpa argumen: `pause(address callbackSender_)`,
 *     dan HANYA bisa dipanggil lewat callback proxy dari watcher terdaftar
 *     (`onlyServiceProvider` + `onlyWatcher`). UI TIDAK BOLEH memanggilnya
 *     langsung — panggilan langsung akan revert `NotAuthorized`.
 *  3. TIDAK ADA `debt()` / `reserves()` di kontrak mana pun. Utang dibaca dari
 *     SYSTEM CONTRACT Lasna (`IPayable.debt(address)`, lihat `SYSTEM_CONTRACT_ABI`
 *     di bawah) — untuk watcher langsung ke system contract, untuk tiap vault ke
 *     callback proxy chain-nya. "Reserves" = saldo ETH kontrak itu sendiri
 *     (`eth_getBalance`); tidak ada fungsi `reserves()` di library reactive-lib-omni.
 *  4. Watcher TIDAK PUNYA `incidents` (jamak). Yang ada: `incident(address)`
 *     (tunggal) -> `(trippedAt, reason, active)`, plus `incidentTiming(address)`
 *     -> `(trippedAt, trippedBlock, trippedTxHash)` dan
 *     `confirmationTiming(chainId, sibling)` -> `(confirmedAt, confirmedTxHash)`.
 *     `trippedAt` tidak berdiri sendiri — baca dari tuple `incident()`.
 *  5. `confirmedPaused(uint256, address)` ADA (mapping publik) — sama seperti
 *     spesifikasi. Helper baca: `isPaused(chainId, sibling)` / `isConfirmed(...)`.
 *  6. `coverDebt()` ADA di kedua kontrak (publik, siapa saja boleh memanggil).
 *  7. Watcher `pause()` / `resume()` adalah pause LOKAL watcher (react() jadi
 *     fall-through), BUKAN pause vault. Jangan tertukar dengan `SiblingVault.pause`.
 */

export const SIBLING_VAULT_ABI = [
  {
    "type": "constructor",
    "inputs": [
      {
        "name": "callbackProxy_",
        "type": "address",
        "internalType": "contract IPayable"
      },
      {
        "name": "owner_",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "watcher_",
        "type": "address",
        "internalType": "address"
      }
    ],
    "stateMutability": "nonpayable"
  },
  {
    "type": "receive",
    "stateMutability": "payable"
  },
  {
    "type": "function",
    "name": "_CALLBACK_SENDER",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "address"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "_SERVICE_PROVIDER",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "contract IPayable"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "coverDebt",
    "inputs": [],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "deposit",
    "inputs": [],
    "outputs": [],
    "stateMutability": "payable"
  },
  {
    "type": "function",
    "name": "emergencyPause",
    "inputs": [
      {
        "name": "reason",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "owner",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "address"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "pause",
    "inputs": [
      {
        "name": "callbackSender_",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "paused",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "pay",
    "inputs": [
      {
        "name": "amount_",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "renounceOwnership",
    "inputs": [],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "setWatcher",
    "inputs": [
      {
        "name": "newWatcher",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "totalDeposited",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "transferOwnership",
    "inputs": [
      {
        "name": "newOwner",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "unpause",
    "inputs": [],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "watcher",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "address"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "withdraw",
    "inputs": [
      {
        "name": "amount",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "event",
    "name": "Deposited",
    "inputs": [
      {
        "name": "from",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "amount",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "EmergencyPaused",
    "inputs": [
      {
        "name": "protocol",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "reason",
        "type": "bytes32",
        "indexed": false,
        "internalType": "bytes32"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "OwnershipTransferred",
    "inputs": [
      {
        "name": "previousOwner",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "newOwner",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "Paused",
    "inputs": [
      {
        "name": "account",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "Unpaused",
    "inputs": [
      {
        "name": "account",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "WatcherSet",
    "inputs": [
      {
        "name": "oldWatcher",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "newWatcher",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "Withdrawn",
    "inputs": [
      {
        "name": "to",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "amount",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "error",
    "name": "CallbackNotAuthorized",
    "inputs": [
      {
        "name": "sender_",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "expectedSender_",
        "type": "address",
        "internalType": "address"
      }
    ]
  },
  {
    "type": "error",
    "name": "EnforcedPause",
    "inputs": []
  },
  {
    "type": "error",
    "name": "EthTransferFailed",
    "inputs": []
  },
  {
    "type": "error",
    "name": "ExpectedPause",
    "inputs": []
  },
  {
    "type": "error",
    "name": "InsufficientBalance",
    "inputs": [
      {
        "name": "requested_",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "available_",
        "type": "uint256",
        "internalType": "uint256"
      }
    ]
  },
  {
    "type": "error",
    "name": "InsufficientFunds",
    "inputs": [
      {
        "name": "required_",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "available_",
        "type": "uint256",
        "internalType": "uint256"
      }
    ]
  },
  {
    "type": "error",
    "name": "NotAuthorized",
    "inputs": [
      {
        "name": "sender_",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "provider_",
        "type": "address",
        "internalType": "address"
      }
    ]
  },
  {
    "type": "error",
    "name": "OwnableInvalidOwner",
    "inputs": [
      {
        "name": "owner",
        "type": "address",
        "internalType": "address"
      }
    ]
  },
  {
    "type": "error",
    "name": "OwnableUnauthorizedAccount",
    "inputs": [
      {
        "name": "account",
        "type": "address",
        "internalType": "address"
      }
    ]
  },
  {
    "type": "error",
    "name": "ReentrancyGuardReentrantCall",
    "inputs": []
  },
  {
    "type": "error",
    "name": "TransferFailed",
    "inputs": []
  },
  {
    "type": "error",
    "name": "UnauthorizedWatcher",
    "inputs": [
      {
        "name": "sender_",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "expected_",
        "type": "address",
        "internalType": "address"
      }
    ]
  },
  {
    "type": "error",
    "name": "WatcherNotSet",
    "inputs": []
  },
  {
    "type": "error",
    "name": "ZeroAddress",
    "inputs": []
  }
] as const;

export const CONTAGION_WATCHER_ABI = [
  {
    "type": "constructor",
    "inputs": [
      {
        "name": "chainIds_",
        "type": "uint256[]",
        "internalType": "uint256[]"
      },
      {
        "name": "siblings_",
        "type": "address[]",
        "internalType": "address[]"
      }
    ],
    "stateMutability": "payable"
  },
  {
    "type": "receive",
    "stateMutability": "payable"
  },
  {
    "type": "function",
    "name": "_SERVICE_PROVIDER",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "contract IPayable"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "clearIncident",
    "inputs": [
      {
        "name": "origin_",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "confirmationTiming",
    "inputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "confirmedAt",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "confirmedTxHash",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "confirmedPaused",
    "inputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "coverDebt",
    "inputs": [],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "incident",
    "inputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "trippedAt",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "reason",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "active",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "incidentTiming",
    "inputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "trippedAt",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "trippedBlock",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "trippedTxHash",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "isConfirmed",
    "inputs": [
      {
        "name": "chainId_",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "sibling_",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "isPaused",
    "inputs": [
      {
        "name": "chainId_",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "sibling_",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "owner",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "address"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "pause",
    "inputs": [],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "paused",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "pay",
    "inputs": [
      {
        "name": "amount_",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "react",
    "inputs": [
      {
        "name": "log_",
        "type": "tuple",
        "internalType": "struct IReactive.LogRecord",
        "components": [
          {
            "name": "chainId",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "contractAddress",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "topic0",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "topic1",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "topic2",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "topic3",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "data",
            "type": "bytes",
            "internalType": "bytes"
          },
          {
            "name": "blockNumber",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "opCode",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "blockHash",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "txHash",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "logIndex",
            "type": "uint256",
            "internalType": "uint256"
          }
        ]
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "registerSibling",
    "inputs": [
      {
        "name": "chainId_",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "sibling_",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "registeredChainIds",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint256[]",
        "internalType": "uint256[]"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "registeredSibling",
    "inputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "resume",
    "inputs": [],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "siblings",
    "inputs": [
      {
        "name": "chainId_",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "address[]",
        "internalType": "address[]"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "unregisterSibling",
    "inputs": [
      {
        "name": "chainId_",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "sibling_",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "event",
    "name": "Callback",
    "inputs": [
      {
        "name": "chainId_",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "contract_",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "gasLimit_",
        "type": "uint64",
        "indexed": true,
        "internalType": "uint64"
      },
      {
        "name": "payload_",
        "type": "bytes",
        "indexed": false,
        "internalType": "bytes"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "IncidentCleared",
    "inputs": [
      {
        "name": "origin",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "IncidentTripped",
    "inputs": [
      {
        "name": "origin",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "chainId",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "reason",
        "type": "bytes32",
        "indexed": false,
        "internalType": "bytes32"
      },
      {
        "name": "trippedAt",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "PauseRequested",
    "inputs": [
      {
        "name": "chainId",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "sibling",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "origin",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "SiblingConfirmed",
    "inputs": [
      {
        "name": "chainId",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "sibling",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "SiblingRegistered",
    "inputs": [
      {
        "name": "chainId",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "sibling",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "SiblingUnregistered",
    "inputs": [
      {
        "name": "chainId",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "sibling",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "WatcherPaused",
    "inputs": [
      {
        "name": "by",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "WatcherResumed",
    "inputs": [
      {
        "name": "by",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      }
    ],
    "anonymous": false
  },
  {
    "type": "error",
    "name": "AlreadyRegistered",
    "inputs": [
      {
        "name": "chainId_",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "sibling_",
        "type": "address",
        "internalType": "address"
      }
    ]
  },
  {
    "type": "error",
    "name": "EmptySiblings",
    "inputs": []
  },
  {
    "type": "error",
    "name": "InsufficientFunds",
    "inputs": [
      {
        "name": "required_",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "available_",
        "type": "uint256",
        "internalType": "uint256"
      }
    ]
  },
  {
    "type": "error",
    "name": "LengthMismatch",
    "inputs": []
  },
  {
    "type": "error",
    "name": "NotAuthorized",
    "inputs": [
      {
        "name": "sender_",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "provider_",
        "type": "address",
        "internalType": "address"
      }
    ]
  },
  {
    "type": "error",
    "name": "NotOwner",
    "inputs": []
  },
  {
    "type": "error",
    "name": "NotRegistered",
    "inputs": [
      {
        "name": "chainId_",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "sibling_",
        "type": "address",
        "internalType": "address"
      }
    ]
  },
  {
    "type": "error",
    "name": "TransferFailed",
    "inputs": []
  },
  {
    "type": "error",
    "name": "ZeroAddress",
    "inputs": []
  }
] as const;

/**
 * System contract ABI (minimal) — HANYA untuk membaca utang.
 * System contract Lasna: 0x8888888888888888888888888888888888888888
 * (alamat infrastruktur Reactive, dari src/ContagionTopics.sol — bukan alamat
 * deployment ContagionStop). `debt(contract)` dipakai untuk watcher (Lasna)
 * dan `debt(vault)` dipanggil pada callback proxy chain vault itu.
 */
export const SYSTEM_CONTRACT_ABI = [
  {
    type: "function",
    name: "debt",
    inputs: [{ name: "contract_", type: "address", internalType: "address" }],
    outputs: [{ name: "debt_", type: "uint256", internalType: "uint256" }],
    stateMutability: "view",
  },
] as const;

/** Chain ID — sesuai design.md §1 dan src/ContagionTopics.sol. */
export const UNICHAIN_SEPOLIA_CHAIN_ID = 1301 as const;
export const BASE_SEPOLIA_CHAIN_ID = 84532 as const;
export const LASNA_CHAIN_ID = 5318007 as const;

/** Explorer per chain (dipakai untuk link tx hash / alamat). */
export const EXPLORERS = {
  [UNICHAIN_SEPOLIA_CHAIN_ID]: "https://sepolia.uniscan.xyz",
  [BASE_SEPOLIA_CHAIN_ID]: "https://sepolia.basescan.org",
  [LASNA_CHAIN_ID]: "https://lasna.reactscan.net",
} as const;

/** Callback proxy per chain tujuan (infrastruktur Reactive — dari ContagionTopics.sol). */
export const CALLBACK_PROXIES = {
  [UNICHAIN_SEPOLIA_CHAIN_ID]:
    "0x775c9B990ADe401060B78D0e98684eEf8d2466C1",
  [BASE_SEPOLIA_CHAIN_ID]:
    "0x476F44b11F5C942c58f4c8E3d0300E5710743585",
} as const;

/** System contract Reactive (sama di Lasna & mainnet). */
export const SYSTEM_CONTRACT_ADDRESS =
  "0x8888888888888888888888888888888888888888" as const;

/**
 * Alamat deployment ContagionStop — LIVE (testnet, 14 Nov 2026).
 *
 * Alamat di bawah ini adalah alamat deploy NYATA (lihat README.md /
 * VERIFICATION.md — terverifikasi on-chain). `LIVE` = true: owner/balance
 * dibaca live via wagmi dan tombol aksi mengirim transaksi nyata.
 */
export const ADDRESSES = {
  siblingVaultA: '0xb18A213bfa8c1888af39AF100d7dd54Aa376F7b5',
  siblingVaultB: '0xa7e3ceb5686f8d3b03e688efdc6a5a64ed80ca4a',
  siblingVaultC: '0xb07a380104ac093485566cfc964540b04518b354',
  contagionWatcher: '0xb18a213bfa8c1888af39af100d7dd54aa376f7b5'
} as const;

/** `true` = kontrak ter-deploy; baca/tulis dari chain via wagmi. */
export const LIVE = true as const;
