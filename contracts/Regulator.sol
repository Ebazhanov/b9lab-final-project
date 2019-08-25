pragma solidity ^0.5.0;

import './Owned.sol';
import './interfaces/RegulatorI.sol';
import './interfaces/TollBoothOperatorI.sol';
import './TollBoothOperator.sol';
contract Regulator is Owned,RegulatorI{
    constructor() public {
    }
    /**
     * represents a collection of Registered Vehicles
     * @param address is the vehicle address
     * @param uint represents a vehicle type
     */
    mapping (address=>uint) registeredVehicles;

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
        fromOwner
        returns(bool success){
            require(vehicle != address(0),"Provide a valid address");
            require(registeredVehicles[vehicle]!=vehicleType,"No state change detected");
            registeredVehicles[vehicle] = vehicleType;
            emit LogVehicleTypeSet(msg.sender,vehicle,vehicleType);
            success = true;
        }

    /**
     * @param vehicle The address of the registered vehicle. It should accept a 0x vehicle address.
     * @return The VehicleType of the vehicle whose address was passed. 0 means it is not
     *   a registered vehicle.
     */
    function getVehicleType(address vehicle)
        view
        public
        returns(uint vehicleType){
           vehicleType = registeredVehicles[vehicle];
        }

    /**
     * represents a TollBoothOperator
     * @param owner is the address of the Toll Booth owner
     * @param deposit is the initial amount deposited
     */
    struct TBOperators{
        address owner;
        uint deposit;
    }

    /**
     * represents a collection of Registered Toll Booth Operators
     * @param address is the tollbooth address
     * @param TollBoothOperator represents a TollBoothOperator struct
     */
    mapping (address=>TBOperators) registeredTollBoothOperators;

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
        fromOwner
        returns(TollBoothOperatorI newOperator){
            require(owner!=getOwner(),"You can not be the onwer of the toll booth");
            require(owner != address(0),"Supply a valid address");
            TollBoothOperator operator = new TollBoothOperator(true,deposit,address(this));
            registeredTollBoothOperators[address(operator)].deposit = deposit;
            registeredTollBoothOperators[address(operator)].owner = owner;
            emit LogTollBoothOperatorCreated(
                msg.sender,
                address(operator),
                owner,
                deposit);
            operator.setOwner(owner);
            newOperator = operator;
        }

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
        fromOwner
        returns(bool success){
            require(registeredTollBoothOperators[operator].owner != address(0),"TollBoothOperator unkown");
            registeredTollBoothOperators[operator].owner = address(0);
            registeredTollBoothOperators[operator].deposit = 0;
            emit LogTollBoothOperatorRemoved(
                    msg.sender,
                    operator);
            success = true;
        }

    /**
     * @param operator The address of the TollBoothOperator to test. It should accept a 0 address.
     * @return Whether the TollBoothOperator is indeed approved.
     */
    function isOperator(address operator)
        view
        public
        returns(bool indeed){
            if(registeredTollBoothOperators[operator].owner != address(0)){
                indeed = true;
            }else{
                indeed = false;
            }
        }

}