pragma solidity ^0.5.0;

import './interfaces/RegulatedI.sol';

contract Regulated is RegulatedI{

    /**
     * private regulator only accessed through getRegulator()
     */
    RegulatorI private currentRegulator;

    /**
     * constructor that takes one `address` parameter, the initial regulator; it should roll back the transaction if the initial regulator argument is `0`.
     */
    constructor(address _regulator) public {
        require(_regulator!=address(0),"Supply a valid regulator address");
        currentRegulator = RegulatorI(_regulator);
        emit LogRegulatorSet(
        _regulator,
        _regulator);
    }

    /**
     * Sets the new regulator for this contract.
     *     It should roll back if any address other than the current regulator of this contract
     *       calls this function.
     *     It should roll back if the new regulator address is 0.
     *     It should roll back if the new regulator is the same as the current regulator.
     * @param newRegulator The new desired regulator of the contract. It is assumed, that this is the
     *     address of a `RegulatorI` contract. It is not necessary to prove it is a `RegulatorI`.
     * @return Whether the action was successful.
     * Emits LogRegulatorSet with:
     *     The sender of the action.
     *     The new regulator.
     */
    function setRegulator(address newRegulator)
        public
        returns(bool success){
            address _regulator = address(currentRegulator);
            require(msg.sender==_regulator,"You are not the regulator");
            require(_regulator!=newRegulator,"Same address cannot be set as regulator");
            currentRegulator = RegulatorI(newRegulator);
            emit LogRegulatorSet(
            _regulator,
            newRegulator);
            return true;
        }

    /**
     * @return The current regulator.
     */
    function getRegulator()
    view
    public
    returns(RegulatorI regulator){
        regulator = currentRegulator;
    }
}