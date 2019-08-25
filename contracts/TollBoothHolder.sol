pragma solidity ^0.5.0;

import './Owned.sol';
import './interfaces/TollBoothHolderI.sol';
contract TollBoothHolder is Owned,TollBoothHolderI{
    constructor() public {
    }
    mapping(address=>bool) private tollBooths;

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
        fromOwner
        returns(bool success){
            require(tollBooth!=address(0),"Supply a valid toll booth");
            require(tollBooths[tollBooth]==false,"This is already a toll Booth");
            tollBooths[tollBooth] = true;
            emit LogTollBoothAdded(
            msg.sender,
            tollBooth);
            success = true;
        }

    /**
     * @param tollBooth The address of the toll booth we enquire about. It should accept a 0 address.
     * @return Whether the toll booth is indeed known to the holder.
     */
    function isTollBooth(address tollBooth)
        public
        view
        returns(bool isIndeed){
            isIndeed = tollBooths[tollBooth];
        }

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
        fromOwner
        returns(bool success){
            require(tollBooth!=address(0),"Toll booth is not valid");
            bool _tollBooth = tollBooths[tollBooth];
            require(_tollBooth==true,"Toll booth already removed");
            tollBooths[tollBooth] = false;
            success = true;
        }
}