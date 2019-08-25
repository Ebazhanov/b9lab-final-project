pragma solidity ^0.5.0;

contract TollBoothOperatorI {

    /**
     * This provides a single source of truth for the encoding algorithm.
     * It will be called:
     *     - by the vehicle prior to sending a deposit.
     *     - by the contract itself when submitted a clear password by a toll booth.
     * @param secret The secret to be hashed. Passing a `0` secret is a valid input.
     * @return the hashed secret.
     */
    function hashSecret(bytes32 secret)
        view
        public
        returns(bytes32 hashed);

    /**
     * Event emitted when a vehicle made the appropriate deposit to enter the road system.
     * @param vehicle The address of the vehicle that entered the road system.
     * @param entryBooth The declared entry booth by which the vehicle will enter the system.
     * @param exitSecretHashed A hashed secret that, when solved, allows the operator to pay itself.
     * @param multiplier The vehicle's multiplier at entry.
     * @param depositedWeis The amount that was deposited as part of the entry.
     */
    event LogRoadEntered(
        address indexed vehicle,
        address indexed entryBooth,
        bytes32 indexed exitSecretHashed,
        uint multiplier,
        uint depositedWeis);

    /**
     * Called by the vehicle entering a road system.
     * Off-chain, the entry toll booth will open its gate after a successful deposit and a confirmation
     * of the vehicle identity.
     *     It should roll back when the contract is in the `true` paused state.
     *     It should roll back when the vehicle is not a registered vehicle.
     *     It should roll back when the vehicle is not allowed on this road system.
     *     It should roll back if `entryBooth` is not a tollBooth.
     *     It should roll back if less than deposit * multiplier was sent alongside.
     *     It should roll back if `exitSecretHashed` has previously been used by anyone to enter.
     *     It should be possible for a vehicle to enter "again" before it has exited from the 
     *       previous entry.
     * @param entryBooth The declared entry booth by which the vehicle will enter the system.
     * @param exitSecretHashed A hashed secret that when solved allows the operator to pay itself.
     * @return Whether the action was successful.
     * Emits LogRoadEntered with:
     *     The sender of the action.
     *     The address of the entry booth.
     *     The hashed secret used to deposit.
     *     The multiplier of the vehicle at entry.
     *     The amount deposited by the vehicle.
     */
    function enterRoad(
            address entryBooth,
            bytes32 exitSecretHashed)
        public
        payable
        returns (bool success);

    /**
     * @param exitSecretHashed The hashed secret used by the vehicle when entering the road.
     * @return The information pertaining to the entry of the vehicle.
     *     vehicle: the address of the vehicle that entered the system.
     *     entryBooth: the address of the booth the vehicle entered at.
     *     multiplier: the vehicle's multiplier at entry.
     *     depositedWeis: how much the vehicle deposited when entering.
     * After the vehicle has exited, and the operator has been paid, `depositedWeis` should be returned as `0`.
     *     The `depositedWeis` should remain unchanged while there is a corresponding pending exit.
     * If no vehicles had ever entered with this hash, all values should be returned as `0`.
     */
    function getVehicleEntry(bytes32 exitSecretHashed)
        view
        public
        returns(
            address vehicle,
            address entryBooth,
            uint multiplier,
            uint depositedWeis);

    /**
     * Event emitted when a vehicle exits a road system.
     * @param exitBooth The toll booth that saw the vehicle exit.
     * @param exitSecretHashed The hash of the secret given by the vehicle as it
     *     passed by the exit booth.
     * @param finalFee The toll charge effectively paid by the vehicle, and taken from the deposit.
     * @param refundWeis The amount refunded to the vehicle, i.e. deposit - charge.
     */
    event LogRoadExited(
        address indexed exitBooth,
        bytes32 indexed exitSecretHashed,
        uint finalFee,
        uint refundWeis);

    /**
     * Event emitted when a vehicle used a route that has no known fee.
     * It is a signal for the oracle to provide a price for the entry / exit pair.
     * @param exitSecretHashed The hashed secret that was defined at the time of entry.
     * @param entryBooth The address of the booth the vehicle entered at.
     * @param exitBooth The address of the booth the vehicle exited at.
     */
    event LogPendingPayment(
        bytes32 indexed exitSecretHashed,
        address indexed entryBooth,
        address indexed exitBooth);

    /**
     * Called by the exit booth.
     *     It should roll back when the contract is in the `true` paused state.
     *     It should roll back when the sender is not a toll booth.
     *     It should roll back if the exit is same as the entry.
     *     It should roll back if hashing the secret does not match a hashed one.
     *     It should roll back if the secret has already been reported on exit.
     * After a successful exit, the storage should be zeroed out as much as possible.
     * @param exitSecretClear The secret given by the vehicle as it passed by the exit booth. Passing a `0` secret is a valid input.
     * @return status:
     *   1: success, -> emits LogRoadExited with:
     *       The sender of the action.
     *       The hashed secret corresponding to the vehicle trip.
     *       The effective charge paid by the vehicle.
     *       The amount refunded to the vehicle.
     *   2: pending oracle -> emits LogPendingPayment with:
     *       The hashed secret corresponding to the vehicle trip.
     *       The entry booth of the vehicle trip.
     *       The exit booth of the vehicle trip.
     */
    function reportExitRoad(bytes32 exitSecretClear)
        public
        returns (uint status);

    /**
     * @param entryBooth the entry booth that has pending payments.
     * @param exitBooth the exit booth that has pending payments.
     * @return the number of payments that are pending because the price for the
     * entry-exit pair was unknown.
     */
    function getPendingPaymentCount(address entryBooth, address exitBooth)
        view
        public
        returns (uint count);

    /**
     * Can be called by anyone. In case more than 1 payment was pending when the oracle gave a price.
     *     It should roll back when the contract is in `true` paused state.
     *     It should roll back if booths are not really booths.
     *     It should roll back if there are fewer than `count` pending payments that are solvable.
     *     It should roll back if `count` is `0`.
     * After a successful clearing, the storage should be zeroed out as much as possible.
     * @param entryBooth the entry booth that has pending payments.
     * @param exitBooth the exit booth that has pending payments.
     * @param count the number of pending payments to clear for the exit booth.
     * @return Whether the action was successful.
     * Emits LogRoadExited as many times as count, each with:
     *       The address of the exit booth.
     *       The hashed secret corresponding to the vehicle trip.
     *       The effective charge paid by the vehicle.
     *       The amount refunded to the vehicle.
     */
    function clearSomePendingPayments(
            address entryBooth,
            address exitBooth,
            uint count)
        public
        returns (bool success);

    /**
     * This function is commented out otherwise it prevents compilation of the completed contracts.
     * This function overrides the eponymous function of `RoutePriceHolderI`, to which it adds the following
     * functionality:
     *     - If relevant, it will release 1 pending payment for this route. As part of this payment
     *       release, it will emit the appropriate `LogRoadExited` event.
     *     - It should be possible to call it even when the contract is in the `true` paused state.
     * After a successful clearing, the storage should be zeroed out as much as possible.
     * Emits LogRoadExited, if applicable, with:
     *       The address of the exit booth.
     *       The hashed secret corresponding to the vehicle trip.
     *       The effective charge paid by the vehicle.
     *       The amount refunded to the vehicle.
     */
    // function setRoutePrice(
    //         address entryBooth,
    //         address exitBooth,
    //         uint priceWeis)
    //     public
    //     returns(bool success);

    /**
     * This function is commented out otherwise it prevents compilation of the completed contracts.
     * This function provides the same functionality with the eponymous function of `PullPaymentA`, which it
     * overrides, and to which it adds the following requirement:
     *     - It should roll back when the contract is in the `true` paused state.
    // function withdrawPayment()
    //     public
    //     returns(bool success);

    /*
     * You need to create:
     *
     * - a contract named `TollBoothOperator` that:
     *     - is `OwnedI`, `PausableI`, `DepositHolderI`, `TollBoothHolderI`,
     *         `MultiplierHolderI`, `RoutePriceHolderI`, `RegulatedI`, `PullPaymentA`, and `TollBoothOperatorI`.
     *     - has a constructor that takes:
     *         - one `bool` parameter, the initial paused state.
     *         - one `uint` parameter, the initial deposit wei value, which cannot be 0.
     *         - one `address` parameter, the initial regulator, which cannot be 0.
     *     - a fallback function that rejects all incoming calls.
     */
}