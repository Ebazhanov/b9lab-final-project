pragma solidity ^0.5.0;

import { TollBoothOperatorI } from "./TollBoothOperatorI.sol";

contract RegulatorI {

    /**
     * uint VehicleType:
     * 0: not a vehicle, absence of a vehicle
     * 1 and above: is a vehicle.
     * For instance:
     *   1: motorbike
     *   2: car
     *   3: lorry
     * Do not construe this list of example vehicle types as a constraint on the acceptable values.
     * All values of vehicle type are acceptable, there is no constraint.
     */

    /**
     * Event emitted when a new vehicle has been registered with its type.
     * @param sender The account that ran the action.
     * @param vehicle The address of the vehicle that is registered.
     * @param vehicleType The VehicleType that the vehicle was just registered as.
     */
    event LogVehicleTypeSet(
        address indexed sender,
        address indexed vehicle,
        uint indexed vehicleType);

    /**
     * Called by the owner of the regulator to register a new vehicle with its VehicleType.
     *     It should roll back if the caller is not the owner of the contract.
     *     It should roll back if the arguments mean no change of state.
     *     It should roll back if a 0x vehicle address is passed.
     * @param vehicle The address of the vehicle being registered. This may be an externally
     *   owned account or a contract. The regulator does not care.
     * @param vehicleType The VehicleType of the vehicle being registered.
     *    passing 0 is equivalent to unregistering the vehicle.
     * @return Whether the action was successful.
     * Emits LogVehicleTypeSet with:
     *     The sender of the action.
     *     The address of the vehicle that was changed.
     *     The vehicle type that was set.
     */
    function setVehicleType(address vehicle, uint vehicleType)
        public
        returns(bool success);

    /**
     * @param vehicle The address of the registered vehicle. It should accept a 0x vehicle address.
     * @return The VehicleType of the vehicle whose address was passed. 0 means it is not
     *   a registered vehicle.
     */
    function getVehicleType(address vehicle)
        view
        public
        returns(uint vehicleType);

    /**
     * Event emitted when a new TollBoothOperator has been created and registered.
     * @param sender The account that ran the action.
     * @param newOperator The newly created TollBoothOperator contract.
     * @param owner The rightful owner of the TollBoothOperator.
     * @param depositWeis The initial deposit amount set in the TollBoothOperator.
     */
    event LogTollBoothOperatorCreated(
        address indexed sender,
        address indexed newOperator,
        address indexed owner,
        uint depositWeis);

    /**
     * Called by the owner of the regulator to deploy a new TollBoothOperator onto the network.
     *     It should roll back if the caller is not the owner of the contract.
     *     It should start the TollBoothOperator in the `true` paused state.
     *     It should roll back if the rightful owner argument is the current owner of the regulator.
     * @param owner The rightful owner of the newly deployed TollBoothOperator.
     * @param deposit The initial value of the TollBoothOperator deposit.
     * @return The address of the newly deployed TollBoothOperator.
     * Emits LogTollBoothOperatorCreated with:
     *     The sender of the action.
     *     The address of the deployed TollBoothOperator.
     *     The rightful owner of the TollBoothOperator.
     *     the initial deposit value.
     */
    function createNewOperator(
            address owner,
            uint deposit)
        public
        returns(TollBoothOperatorI newOperator);

    /**
     * Event emitted when a TollBoothOperator has been removed from the list of approved operators.
     * @param sender The account that ran the action.
     * @param operator The removed TollBoothOperator.
     */
    event LogTollBoothOperatorRemoved(
        address indexed sender,
        address indexed operator);

    /**
     * Called by the owner of the regulator to remove a previously deployed TollBoothOperator from
     * the list of approved operators.
     *     It should roll back if the caller is not the owner of the contract.
     *     It should roll back if the operator is unknown.
     * @param operator The address of the contract to remove.
     * @return Whether the action was successful.
     * Emits LogTollBoothOperatorRemoved with:
     *     The sender of the action.
     *     The address of the remove TollBoothOperator.
     */
    function removeOperator(address operator)
        public
        returns(bool success);

    /**
     * @param operator The address of the TollBoothOperator to test. It should accept a 0 address.
     * @return Whether the TollBoothOperator is indeed approved.
     */
    function isOperator(address operator)
        view
        public
        returns(bool indeed);

    /*
     * You need to create:
     *
     * - a contract named `Regulator` that:
     *     - is `OwnedI` and `RegulatorI`.
     *     - has a constructor that takes no parameter, or you omit it.
     */        
}