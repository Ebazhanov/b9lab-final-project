pragma solidity ^0.5.0;

import './interfaces/OwnedI.sol';

    /**
     * Contract `Owned` extends: `OwnedI`
     */
contract Owned is OwnedI{
    /**
     * variable @param contractOwner
     * holds the value of the current owner
     * set in constructor upon contract deployment
     * is private so that accessing it is only through getOwner()
     */
    address private contractOwner;

    /**
     * constructor that takes no parameter.
     * constructor sets the value of owner to the deployer
     * logs an event LogOwnerSet
     */
    constructor() public{
        contractOwner = msg.sender;
        emit LogOwnerSet(msg.sender, msg.sender);
    }

    /**
     * a modifier named `fromOwner` that rolls back the transaction if the transaction sender is not the owner.
     */
    modifier fromOwner(){
        require(msg.sender == contractOwner,"You are not the owner");
        _;
    }

     /**
     * Sets the new owner for this contract.
     *     It should roll back if the caller is not the current owner.
     *     It should roll back if the argument is the current owner.
     *     It should roll back if the argument is a 0 address.
     * @param newOwner The new owner of the contract
     * @return Whether the action was successful.
     * Emits LogOwnerSet with:
     *     The sender of the action.
     *     The new owner.
     */
    function setOwner(address newOwner) public fromOwner returns(bool success){
        address _owner = contractOwner;
        require(newOwner != address(0),"Supply a valid address");
        require(newOwner != _owner,"You are alread the owner");
        contractOwner = newOwner;
        emit LogOwnerSet(_owner, newOwner);
        success = true;
    }

    /**
     * @return The owner of this contract.
     */
    function getOwner() public view returns(address owner){
        owner = contractOwner;
    }
}