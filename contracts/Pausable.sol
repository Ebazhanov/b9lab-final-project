pragma solidity ^0.5.0;

import './Owned.sol';
import './interfaces/PausableI.sol';

    /**
     * contract`Pausable` extends: `OwnedI``PausableI`
     */
contract Pausable is Owned,PausableI{
    /**
     * variable @param paused
     * holds the value of the pausable state
     * passed in constructor upon contract deployment
     * is private so that accessing it is only through isPaused()
     */
    bool private paused;

    /**
    * a constructor that takes one `bool` parameter, the initial paused state.
    */
    constructor(bool _paused) public {
        paused = _paused;
        emit LogPausedSet(msg.sender, _paused);
    }

    /**
     * Sets the new paused state for this contract.
     *     It should roll back if the caller is not the current owner of this contract.
     *     It should roll back if the state passed is no different from the current.
     * @param newState The new desired "paused" state of the contract.
     * @return Whether the action was successful.
     * Emits LogPausedSet with:
     *     The sender of the action.
     *     The new state.
     */
    function setPaused(bool newState) public fromOwner returns(bool success){
        require(newState != paused,"Supply a different state");
        paused = newState;
        emit LogPausedSet(msg.sender, paused);
        success = true;
    }

    /**
     * modifier named `whenPaused` that rolls back the transaction if the contract is in the `false` paused state.
     */
     modifier whenPaused(){
         require(paused == true,"Contract is paused");
         _;
     }

     /**
     * modifier named `whenNotPaused` that rolls back the transaction if the contract is in the `true` paused state
     */
     modifier whenNotPaused(){
         require(paused == false,"Contract is not paused");
         _;
     }

    /**
     * @return Whether the contract is indeed paused.
     */
    function isPaused() public view  returns(bool isIndeed){
        isIndeed = paused;
    }
}