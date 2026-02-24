;; title: On-Chain Farm Produce Forward Contracts
;; version: 1.0.0
;; summary: A decentralized marketplace for agricultural forward contracts
;; description: Enables farmers to lock future produce with delivery dates and buyers to lock STX,
;;              protecting farmers from price crashes and guaranteeing supply for buyers.

;; traits
;;

;; token definitions
;;

;; constants
;;
(define-constant CONTRACT-OWNER tx-sender)
(define-constant ERR-NOT-AUTHORIZED (err u100))
(define-constant ERR-CONTRACT-NOT-FOUND (err u101))
(define-constant ERR-ALREADY-FULFILLED (err u102))
(define-constant ERR-ALREADY-CANCELLED (err u103))
(define-constant ERR-NOT-BUYER (err u104))
(define-constant ERR-NOT-FARMER (err u105))
(define-constant ERR-INSUFFICIENT-FUNDS (err u106))
(define-constant ERR-DELIVERY-DATE-PASSED (err u107))
(define-constant ERR-DELIVERY-DATE-NOT-REACHED (err u108))
(define-constant ERR-INVALID-QUANTITY (err u109))
(define-constant ERR-INVALID-PRICE (err u110))
(define-constant ERR-ALREADY-PURCHASED (err u111))
(define-constant ERR-NOT-PURCHASED (err u112))
(define-constant ERR-DISPUTE-WINDOW-CLOSED (err u113))
(define-constant ERR-ALREADY-DISPUTED (err u114))
(define-constant ERR-NO-DISPUTE (err u115))
(define-constant ERR-INVALID-STATUS (err u116))

;; Contract statuses
(define-constant STATUS-OPEN u1)
(define-constant STATUS-PURCHASED u2)
(define-constant STATUS-FULFILLED u3)
(define-constant STATUS-CANCELLED u4)
(define-constant STATUS-DISPUTED u5)
(define-constant STATUS-RESOLVED u6)

;; Platform fee (0.5% = 50 basis points out of 10000)
(define-constant PLATFORM-FEE-BASIS-POINTS u50)
(define-constant BASIS-POINTS-DIVISOR u10000)

;; Dispute window (blocks - approximately 7 days if 10 min blocks)
(define-constant DISPUTE-WINDOW-BLOCKS u1008)

;; data vars
;;
(define-data-var contract-nonce uint u0)
(define-data-var platform-fees-collected uint u0)

;; data maps
;;

;; Main contract structure
(define-map forward-contracts
  uint  ;; contract-id
  {
    farmer: principal,
    buyer: (optional principal),
    produce-type: (string-ascii 50),
    quantity: uint,  ;; in kilograms or units
    price-per-unit: uint,  ;; in microSTX
    total-price: uint,  ;; in microSTX
    delivery-date: uint,  ;; block height
    created-at: uint,  ;; block height
    fulfilled-at: (optional uint),  ;; block height
    status: uint,
    dispute-reason: (optional (string-ascii 500)),
    resolution-notes: (optional (string-ascii 500))
  }
)

;; Track farmer's contracts
(define-map farmer-contracts
  principal
  (list 100 uint)  ;; list of contract-ids
)

;; Track buyer's contracts
(define-map buyer-contracts
  principal
  (list 100 uint)  ;; list of contract-ids
)

;; Escrow for locked STX
(define-map contract-escrow
  uint  ;; contract-id
  {
    locked-amount: uint,
    locked-at: uint
  }
)

;; public functions
;;

;; Create a new forward contract
(define-public (create-forward-contract
    (produce-type (string-ascii 50))
    (quantity uint)
    (price-per-unit uint)
    (delivery-date uint))
  (let
    (
      (contract-id (+ (var-get contract-nonce) u1))
      (total-price (* quantity price-per-unit))
    )
    ;; Validations
    (asserts! (> quantity u0) ERR-INVALID-QUANTITY)
    (asserts! (> price-per-unit u0) ERR-INVALID-PRICE)
    (asserts! (> delivery-date stacks-block-height) ERR-DELIVERY-DATE-PASSED)

    ;; Create contract
    (map-set forward-contracts contract-id
      {
        farmer: tx-sender,
        buyer: none,
        produce-type: produce-type,
        quantity: quantity,
        price-per-unit: price-per-unit,
        total-price: total-price,
        delivery-date: delivery-date,
        created-at: stacks-block-height,
        fulfilled-at: none,
        status: STATUS-OPEN,
        dispute-reason: none,
        resolution-notes: none
      }
    )

    ;; Update farmer's contract list
    (map-set farmer-contracts tx-sender
      (unwrap! (as-max-len? (append (get-farmer-contract-list tx-sender) contract-id) u100) ERR-INVALID-QUANTITY)
    )

    ;; Increment nonce
    (var-set contract-nonce contract-id)

    (ok contract-id)
  )
)

;; Buyer purchases a forward contract
(define-public (purchase-contract (contract-id uint))
  (let
    (
      (contract (unwrap! (map-get? forward-contracts contract-id) ERR-CONTRACT-NOT-FOUND))
      (total-price (get total-price contract))
      (platform-fee (calculate-platform-fee total-price))
      (total-required (+ total-price platform-fee))
    )
    ;; Validations
    (asserts! (is-eq (get status contract) STATUS-OPEN) ERR-ALREADY-PURCHASED)
    (asserts! (> (get delivery-date contract) stacks-block-height) ERR-DELIVERY-DATE-PASSED)
    (asserts! (not (is-eq tx-sender (get farmer contract))) ERR-NOT-AUTHORIZED)

    ;; Transfer STX to escrow (contract holds it)
    (try! (stx-transfer? total-required tx-sender (as-contract tx-sender)))

    ;; Update contract with buyer
    (map-set forward-contracts contract-id
      (merge contract {
        buyer: (some tx-sender),
        status: STATUS-PURCHASED
      })
    )

    ;; Store escrow details
    (map-set contract-escrow contract-id
      {
        locked-amount: total-price,
        locked-at: stacks-block-height
      }
    )

    ;; Update buyer's contract list
    (map-set buyer-contracts tx-sender
      (unwrap! (as-max-len? (append (get-buyer-contract-list tx-sender) contract-id) u100) ERR-INVALID-QUANTITY)
    )

    ;; Track platform fees
    (var-set platform-fees-collected (+ (var-get platform-fees-collected) platform-fee))

    (ok true)
  )
)

;; Farmer marks contract as fulfilled (delivery completed)
(define-public (fulfill-contract (contract-id uint))
  (let
    (
      (contract (unwrap! (map-get? forward-contracts contract-id) ERR-CONTRACT-NOT-FOUND))
      (escrow (unwrap! (map-get? contract-escrow contract-id) ERR-NOT-PURCHASED))
    )
    ;; Validations
    (asserts! (is-eq tx-sender (get farmer contract)) ERR-NOT-FARMER)
    (asserts! (is-eq (get status contract) STATUS-PURCHASED) ERR-INVALID-STATUS)
    (asserts! (>= stacks-block-height (get delivery-date contract)) ERR-DELIVERY-DATE-NOT-REACHED)

    ;; Update contract status
    (map-set forward-contracts contract-id
      (merge contract {
        status: STATUS-FULFILLED,
        fulfilled-at: (some stacks-block-height)
      })
    )

    ;; Transfer funds to farmer (after dispute window, buyer can confirm or dispute)
    ;; For now, we mark as fulfilled and wait for dispute window

    (ok true)
  )
)

;; Buyer confirms delivery and releases payment
(define-public (confirm-delivery (contract-id uint))
  (let
    (
      (contract (unwrap! (map-get? forward-contracts contract-id) ERR-CONTRACT-NOT-FOUND))
      (escrow (unwrap! (map-get? contract-escrow contract-id) ERR-NOT-PURCHASED))
      (buyer (unwrap! (get buyer contract) ERR-NOT-PURCHASED))
    )
    ;; Validations
    (asserts! (is-eq tx-sender buyer) ERR-NOT-BUYER)
    (asserts! (is-eq (get status contract) STATUS-FULFILLED) ERR-INVALID-STATUS)

    ;; Release payment to farmer
    (try! (as-contract (stx-transfer? (get locked-amount escrow) tx-sender (get farmer contract))))

    ;; Update status
    (map-set forward-contracts contract-id
      (merge contract {
        status: STATUS-RESOLVED
      })
    )

    ;; Clear escrow
    (map-delete contract-escrow contract-id)

    (ok true)
  )
)

;; Buyer raises a dispute
(define-public (raise-dispute (contract-id uint) (reason (string-ascii 500)))
  (let
    (
      (contract (unwrap! (map-get? forward-contracts contract-id) ERR-CONTRACT-NOT-FOUND))
      (buyer (unwrap! (get buyer contract) ERR-NOT-PURCHASED))
      (fulfilled-at (unwrap! (get fulfilled-at contract) ERR-INVALID-STATUS))
    )
    ;; Validations
    (asserts! (is-eq tx-sender buyer) ERR-NOT-BUYER)
    (asserts! (is-eq (get status contract) STATUS-FULFILLED) ERR-INVALID-STATUS)
    (asserts! (<= (- stacks-block-height fulfilled-at) DISPUTE-WINDOW-BLOCKS) ERR-DISPUTE-WINDOW-CLOSED)

    ;; Update contract with dispute
    (map-set forward-contracts contract-id
      (merge contract {
        status: STATUS-DISPUTED,
        dispute-reason: (some reason)
      })
    )

    (ok true)
  )
)

;; Auto-release funds after dispute window (if no dispute)
(define-public (auto-release-funds (contract-id uint))
  (let
    (
      (contract (unwrap! (map-get? forward-contracts contract-id) ERR-CONTRACT-NOT-FOUND))
      (escrow (unwrap! (map-get? contract-escrow contract-id) ERR-NOT-PURCHASED))
      (fulfilled-at (unwrap! (get fulfilled-at contract) ERR-INVALID-STATUS))
    )
    ;; Validations
    (asserts! (is-eq (get status contract) STATUS-FULFILLED) ERR-INVALID-STATUS)
    (asserts! (> (- stacks-block-height fulfilled-at) DISPUTE-WINDOW-BLOCKS) ERR-DISPUTE-WINDOW-CLOSED)

    ;; Release payment to farmer
    (try! (as-contract (stx-transfer? (get locked-amount escrow) tx-sender (get farmer contract))))

    ;; Update status
    (map-set forward-contracts contract-id
      (merge contract {
        status: STATUS-RESOLVED
      })
    )

    ;; Clear escrow
    (map-delete contract-escrow contract-id)

    (ok true)
  )
)

;; Cancel contract (only if not purchased)
(define-public (cancel-contract (contract-id uint))
  (let
    (
      (contract (unwrap! (map-get? forward-contracts contract-id) ERR-CONTRACT-NOT-FOUND))
    )
    ;; Validations
    (asserts! (is-eq tx-sender (get farmer contract)) ERR-NOT-FARMER)
    (asserts! (is-eq (get status contract) STATUS-OPEN) ERR-ALREADY-PURCHASED)

    ;; Update status
    (map-set forward-contracts contract-id
      (merge contract {
        status: STATUS-CANCELLED
      })
    )

    (ok true)
  )
)

;; Resolve dispute (contract owner only - can be upgraded to DAO governance)
(define-public (resolve-dispute
    (contract-id uint)
    (release-to-farmer bool)
    (resolution-notes (string-ascii 500)))
  (let
    (
      (contract (unwrap! (map-get? forward-contracts contract-id) ERR-CONTRACT-NOT-FOUND))
      (escrow (unwrap! (map-get? contract-escrow contract-id) ERR-NOT-PURCHASED))
      (buyer (unwrap! (get buyer contract) ERR-NOT-PURCHASED))
    )
    ;; Only contract owner can resolve (can be upgraded to arbitration system)
    (asserts! (is-eq tx-sender CONTRACT-OWNER) ERR-NOT-AUTHORIZED)
    (asserts! (is-eq (get status contract) STATUS-DISPUTED) ERR-NO-DISPUTE)

    ;; Release funds based on decision
    (if release-to-farmer
      (try! (as-contract (stx-transfer? (get locked-amount escrow) tx-sender (get farmer contract))))
      (try! (as-contract (stx-transfer? (get locked-amount escrow) tx-sender buyer)))
    )

    ;; Update contract
    (map-set forward-contracts contract-id
      (merge contract {
        status: STATUS-RESOLVED,
        resolution-notes: (some resolution-notes)
      })
    )

    ;; Clear escrow
    (map-delete contract-escrow contract-id)

    (ok true)
  )
)

;; Withdraw platform fees (contract owner only)
(define-public (withdraw-platform-fees)
  (let
    (
      (fees (var-get platform-fees-collected))
    )
    (asserts! (is-eq tx-sender CONTRACT-OWNER) ERR-NOT-AUTHORIZED)
    (asserts! (> fees u0) ERR-INSUFFICIENT-FUNDS)

    ;; Transfer fees to owner
    (try! (as-contract (stx-transfer? fees tx-sender CONTRACT-OWNER)))

    ;; Reset fees counter
    (var-set platform-fees-collected u0)

    (ok fees)
  )
)

;; read only functions
;;

;; Get contract details
(define-read-only (get-contract (contract-id uint))
  (ok (map-get? forward-contracts contract-id))
)

;; Get escrow details
(define-read-only (get-escrow (contract-id uint))
  (ok (map-get? contract-escrow contract-id))
)

;; Get contracts by farmer
(define-read-only (get-farmer-contracts (farmer principal))
  (ok (get-farmer-contract-list farmer))
)

;; Get contracts by buyer
(define-read-only (get-buyer-contracts (buyer principal))
  (ok (get-buyer-contract-list buyer))
)

;; Get total contracts created
(define-read-only (get-total-contracts)
  (ok (var-get contract-nonce))
)

;; Get platform fees collected
(define-read-only (get-platform-fees)
  (ok (var-get platform-fees-collected))
)

;; Get contract status
(define-read-only (get-contract-status (contract-id uint))
  (ok (get status (unwrap! (map-get? forward-contracts contract-id) ERR-CONTRACT-NOT-FOUND)))
)

;; Check if contract is in dispute window
(define-read-only (is-in-dispute-window (contract-id uint))
  (let
    (
      (contract (unwrap! (map-get? forward-contracts contract-id) ERR-CONTRACT-NOT-FOUND))
      (fulfilled-at (unwrap! (get fulfilled-at contract) ERR-INVALID-STATUS))
    )
    (ok (<= (- stacks-block-height fulfilled-at) DISPUTE-WINDOW-BLOCKS))
  )
)

;; private functions
;;

;; Calculate platform fee
(define-private (calculate-platform-fee (amount uint))
  (/ (* amount PLATFORM-FEE-BASIS-POINTS) BASIS-POINTS-DIVISOR)
)

;; Get farmer's contract list (helper)
(define-private (get-farmer-contract-list (farmer principal))
  (default-to (list) (map-get? farmer-contracts farmer))
)

;; Get buyer's contract list (helper)
(define-private (get-buyer-contract-list (buyer principal))
  (default-to (list) (map-get? buyer-contracts buyer))
)
