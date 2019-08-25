pragma solidity ^0.5.0;

contract TollBoothHolderI {

    /**
     * Event emitted when a toll booth has been added to the TollBoothHolder.
     * @param sender The account that ran the action.
     * @param tollBooth The toll booth just added.
     */
    event LogTollBoothAdded(
        address indexed sender,
        address indexed tollBooth);

    /**
     * Called by the owner of the TollBoothHolder.
     *     It should roll back if the caller is not the owner of the contract.
     *     It should roll back if the argument is already a toll booth.
     *     It should roll back if the argument is a 0x address.
     *     When part of TollBoothOperatorI, it should be possible to add toll booths even when
     *       the contract is paused.
     * @param tollBooth The address of the toll booth being added.
     * @return Whether the action was successful.
     * Emits LogTollBoothAdded with:
     *     The sender of the action.
     *     The address of the toll booth just added.
     */
    function addTollBooth(address tollBooth)
        public
        returns(bool success);

    /**
     * @param tollBooth The address of the toll booth we enquire about. It should accept a 0 address.
     * @return Whether the toll booth is indeed known to the holder.
     */
    function isTollBooth(address tollBooth)
        view
        public
        returns(bool isIndeed);

    /**
     * Event emitted when a toll booth has been removed from the TollBoothOperator.
     * @param sender The account that ran the action.
     * @param tollBooth The toll booth just removed.
     */
    event LogTollBoothRemoved(
        address indexed sender,
        address indexed tollBooth);

    /**
     * Called by the owner of the TollBoothHolder.
     *     It should roll back if the caller is not the owner of the contract.
     *     It should roll back if the argument has already been removed.
     *     It should roll back if the argument is a 0x address.
     *     When part of TollBoothOperatorI, it should be possible to remove toll booth even when
     *       the contract is paused.
     * @param tollBooth The toll booth to remove.
     * @return Whether the action was successful.
     * Emits LogTollBoothRemoved with:
     *     The sender of the action.
     *     The address of the toll booth just removed.
     */
    function removeTollBooth(address tollBooth)
        public
        returns(bool success);

    /*
     * You need to create:
     *
     * - a contract named `TollBoothHolder` that:
     *     - is `OwnedI`, `TollBoothHolderI`.
     *     - has a constructor that takes no parameter, or you omit it.
     */        
}