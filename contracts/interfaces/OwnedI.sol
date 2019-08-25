pragma solidity ^0.5.0;

contract OwnedI {
    /**
     * Event emitted when a new owner has been set.
     * @param previousOwner The previous owner, who happened to effect the change.
     * @param newOwner The new, and current, owner the contract.
     */
    event LogOwnerSet(address indexed previousOwner, address indexed newOwner);

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
    function setOwner(address newOwner) public returns(bool success);

    /**
     * @return The owner of this contract.
     */
    function getOwner() view public returns(address owner);

    /*
     * You need to create:
     *
     * - a contract named `Owned` that:
     *     - is a `OwnedI`.
     *     - has a modifier named `fromOwner` that rolls back the transaction if the
     * transaction sender is not the owner.
     *     - has a constructor that takes no parameter, or you omit it.
     */
}