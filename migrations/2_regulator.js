const Regulator = artifacts.require("Regulator");
const TollBoothOperator = artifacts.require("TollBoothOperator");

module.exports = function(deployer, _network, accounts) {
  const regulatorOwner = accounts[0];
  const tollBoothOperatorOwner = accounts[1];
  const deposit = Math.floor(Math.random() * accounts.length*5);
  deployer
    .deploy(Regulator, { from: regulatorOwner })
    .then(function(regulator) {
      console.log("creating TollBothOperator");
      return regulator.createNewOperator(
        tollBoothOperatorOwner,
        deposit,
        { from: regulatorOwner }
      );
    })
    .then(function(transaction) {
      console.log("LogTollBoothOperatorCreated event");
      return transaction.logs.find(function(log) {
        return log.event === "LogTollBoothOperatorCreated";
      });
    })
    .then(function(log) {
      console.log(
        "retrieve TollBoothOperator instance",
        log.args.newOperator
      );
      return TollBoothOperator.at(log.args.newOperator);
    })
    .then(function(tollBoothOperator) {
      console.log("unpause TollBoothOperator");
      tollBoothOperator.setPaused(false, {
        from: tollBoothOperatorOwner
      });
    });
};