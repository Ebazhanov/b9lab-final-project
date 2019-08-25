pragma solidity ^0.5.0;

import './Owned.sol';
import './interfaces/DepositHolderI.sol';

contract DepositHolder is Owned, DepositHolderI{
    uint private deposit;
    /**
     * constructor that takes one `uint` parameter,
     * the initial deposit wei value; it should roll back the
     * transaction if the initial deposit argument is `0`.
     */
    constructor(uint initialDeposit) public {
        require(initialDeposit > 0,"Initial deposit cannot be 0");
        deposit = initialDeposit;
        emit LogDepositSet(msg.sender, initialDeposit);
    }
    /**
     * Called by the owner of the DepositHolder.
     *     It should roll back if the caller is not the owner of the contract.
     *     It should roll back if the argument passed is 0.
     *     It should roll back if the argument is no different from the current deposit.
     * @param depositWeis The value of the deposit being set, measured in weis.
     * @return Whether the action was successful.
     * Emits LogDepositSet with:
     *     The sender of the action.
     *     The new value that was set.
     */
    function setDeposit(uint depositWeis)
        public
        fromOwner
        returns(bool success){
           require(depositWeis > 0,"Initial deposit cannot be 0");
           require(depositWeis != deposit,"New deposit cannot be same as current deposit");
            deposit = depositWeis;
            emit LogDepositSet(msg.sender, depositWeis);
            return true;
        }

    /**
     * @return The base price, then to be multiplied by the multiplier, a given vehicle
     * needs to deposit to enter the road system.
     */
    function getDeposit()
        public
        view
        returns(uint weis){
            weis = deposit;
        }
}