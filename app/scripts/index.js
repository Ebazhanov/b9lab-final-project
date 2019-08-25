// Import the page's CSS. Webpack will know what to do with it.
import "../styles/app.css";

const Web3 = require("web3");
const Promise = require("bluebird");
const truffle = require("truffle-contract");
const $ = require("jquery");
const RegulatorJson = require("../../build/contracts/Regulator.json");
const TollBoothOperatorJson = require("../../build/contracts/TollBoothOperator.json");


const Regulator = truffle(RegulatorJson);
const TollBoothOperator = truffle(TollBoothOperatorJson);

   window.App = {
    accounts: null,
    account: null,
    web3Provider: null,
    source:null,
    contracts: {},
    init: async function() {
      return await App.initWeb3();
    },
    initWeb3: async function() {
      // Modern dapp browsers...
      if (window.ethereum) {
        App.web3Provider = window.ethereum;
        try {
          // Request account access
          await window.ethereum.enable();
        } catch (error) {
          // User denied account access...
          console.error("User denied account access")
        }
      }
      // Legacy dapp browsers...
      if (window.web3) {
        App.web3Provider = window.web3.currentProvider;
        App.source = "MetaMask";
      }
      // If no injected web3 instance is detected, fall back to Ganache
      else {
        App.web3Provider = new Web3.providers.HttpProvider('http://localhost:8545');
        App.source = "JSONRPC";
      }
      
      window.web3 = new Web3(App.web3Provider);
          return App.start();
    },
    start: async function() {
      Regulator.setProvider(web3.currentProvider);
      TollBoothOperator.setProvider(web3.currentProvider);
      App.contracts.regulator = await Regulator.deployed();
      App.contracts.operator = TollBoothOperator;
      console.log("app loaded");
      // Get the initial account balance so it can be displayed.
      try{
        App.accounts = await web3.eth.getAccounts();
        console.log(App.accounts);
        if (App.accounts.length == 0) {
          alert("Couldn't get any accounts! Make sure your Ethereum client is configured correctly.");
          return;
        }else{
          App.account = App.accounts[0];
          if(App.source == "JSONRPC"){
            $("#accounts_drop_down_msg").html("Select an address to use from below:");
            $("#accounts_drop_down").show();
            let dropdown;
            App.accounts.forEach(
              async function(accounts){
                    dropdown+='<option value="'+accounts+'">'+accounts+'</option>';
                    $("#accounts_drop_down").html(dropdown);
              }
            );
          }else{
            $("#accounts_drop_down_msg").html("Using Meta Mask, change addresses via Meta Mask");
            $("#accounts_drop_down").hide();
          }
          App.bindEvents();
          App.refreshBalance();
          App.getVehicleBalance();
        }
      }catch(err){
        alert("There was an error fetching your accounts.");
      }
    },
  
    setStatus: function(message) {
      var status = document.getElementById("status");
      status.innerHTML = message;
    },
  
    refreshBalance: async function() {
      try{
      //get balance
      const bal = await web3.eth.getBalance(App.contracts.regulator.address);
      console.log("regulator balance " + bal);
      App.setStatus("Regulator Balance: "+bal);
    
      const operators = await App.contracts.regulator.getPastEvents('LogTollBoothOperatorCreated', {
        filter: {owner: App.account},
        fromBlock: 0,
        toBlock: 'latest'
        });
      console.log(operators);
      if(operators.length <1){
        $("#tb_operator").html("You do not have any TollBooths to operate");
        $("#tb_select").hide();
      }else{
        $("#tb_operator").html("Select a TollBoothOperator contract to use from below:");
        $("#tb_select").show();
        let dropdown;
        operators.forEach(
          async function(operator){
            let isOperator = await App.contracts.regulator.isOperator.call(operator.args.newOperator);
            if(isOperator){
              let contract = await TollBoothOperator.at(operator.args.newOperator);
              let owner = await contract.getOwner.call();
              if(App.account == owner){
                dropdown+='<option value="'+operator.args.newOperator+'">'+operator.args.newOperator+'</option>';
                $("#tb_select").html(dropdown);
              }
            }
          }
        );
        
      }

    const logs = await App.contracts.regulator.getPastEvents('LogTollBoothOperatorCreated', {
      filter: {},
      fromBlock: 0,
      toBlock: 'latest'
    });

    console.log(logs);
      if(logs.length < 1){
        $("#tb_operator1").html("There are no TollBoothOperators Deployed");
        $("#tb_select1").hide();
      }else{
      $("#tb_operator1").html("Select a TollBoothOperator contract to use from below:");
      $("#tb_select1").show();
      let dropdown1;
      
      logs.forEach(
        async function(log){
          let isOperator = await App.contracts.regulator.isOperator.call(log.args.newOperator);
          if(isOperator){
          dropdown1 +='<option value="'+log.args.newOperator+'">'+log.args.newOperator+'</option>';
          $("#tb_select1").html(dropdown1);
          }
        }
      );
      }

      if(logs.length < 1){
        $("#tb_operator2").html("There are no TollBoothOperators Deployed");
        $("#tb_select2").hide();
      }else{
      $("#tb_operator2").html("Select a TollBoothOperator contract to use from below:");
      $("#tb_select2").show();
      let dropdown2;
      
      logs.forEach(
        async function(log){
          let isOperator = await App.contracts.regulator.isOperator.call(log.args.newOperator);
          if(isOperator){
            let contract = await TollBoothOperator.at(log.args.newOperator);
            let isTollBooth = await contract.isTollBooth.call(App.account);
            if(isTollBooth){
              dropdown2 +='<option value="'+log.args.newOperator+'">'+log.args.newOperator+'</option>';
              $("#tb_select2").html(dropdown2);
            }
          }
        }
      );
      }

  }catch(e){
    console.log(e);
  }
    },
    
    getVehicleBalance: async function(){
      try{
      var vtype = await App.contracts.regulator.getVehicleType.call(App.account,{from: App.account});
      console.log(vtype);
        var status = document.getElementById("vehicleBal");
        if(vtype == 0){
          status.innerHTML = "You are not a registered vehicle, we have nothing to display.";
        }else{
          web3.eth.getBalance(App.account, function(err, balance) {
            if (err) {
                console.log(err);
                "Could not check vehicle address balance at this moment, check logs";
            } else {
              console.log(balance);
              status.innerHTML ="Vehicle balance " + balance;
            }
          });
        }
      }catch(e){
        console.log(e);
        var status = document.getElementById("vehicleBal");
        status.innerHTML = "Could not check vehicle type at this moment, check logs";
      }

    },
    bindEvents: async function() {
     $(document).on('click', '#opbtn', App.handleNewOperator);
     $(document).on('click','#vetypebtn', App.handleVehicleType);
     $(document).on('click','#tolbtn', App.handleAddTollBooth);
     $(document).on('click','#tolroute', App.handleSetBasPrice);
     $(document).on('click','#genhash', App.handleGenHash);
     $(document).on('click','#entdep', App.handleEnterBooth);
     $(document).on('click','#extHashbtn', App.handleGetExitHistory);
     $(document).on('click','#exitsecretbtn', App.handleReportExit);
     $(document).on('click','#setmultiplier', App.handleSetMultiplier);
     $(document).on('change','#accounts_drop_down', App.changeAccounts);
  },
  changeAccounts: function(){
    let e = document.getElementById("accounts_drop_down");
    var address = e.options[e.selectedIndex].value;
    App.account = address;
    console.log(address);
    App.refreshBalance();
          App.getVehicleBalance();
  },
  clean: function(value){
    return value.replace(/\s/g,'');
  },
  handleNewOperator: async function() {
      var deposit = parseInt(document.getElementById("opbal").value,10);
      var owner = document.getElementById("opadd").value;
      console.log(deposit);
      console.log(owner = App.clean(owner));
  
      App.setStatus("Initiating transaction... (please wait)");
      try{
      const success = await App.contracts.regulator.createNewOperator.call(owner,deposit,{
        from: App.account
      });
      if(success){
        const gas = await App.contracts.regulator.createNewOperator.estimateGas(owner,deposit,{from:App.account});
        console.log(gas);
        web3.eth.getBlock("latest", async function(error, block){
          if(!error){
          App.contracts.regulator.createNewOperator(owner, deposit,{from:App.account,gas:block.gasLimit})
          .on("transactionHash",async (hash)=>{
            App.setStatus("Your transaction with Hash "+hash+" is on its way!");
          })
          
          .on("receipt",async(receipt)=>{
            let logs=[];let i=0;
            receipt.logs.forEach(
              function(item){
                logs[i] = item.event;
                i++;
                logs[i] = item.args;
                i++;
              }
            )
            if(receipt.status == 1){
              App.setStatus("Transaction was succesful: "+"<small><samp><pre>"+JSON.stringify(logs, undefined, 1)+"</pre></samp></small>");
              }else{
                App.setStatus("Transaction has failed: "+"<small><samp><pre>"+JSON.stringify(logs, undefined, 1)+"</pre></samp></small>");
              }
                console.log(receipt);
        })
          .on("error",async(error)=>{
            App.setStatus("Transaction failed due to: "+error);
          })
        }else{
              console.error(error);
        }
       })
      }
      }catch(e){
        console.log(e);
        App.setStatus(e.message);
      }
    },
    handleVehicleType: async function() {
      var add = document.getElementById("veadd").value;
      var typ = parseInt(document.getElementById("vetype").value);
      add = App.clean(add);
      App.setStatus("Initiating transaction... (please wait)");
  
      try{
      const test = await App.contracts.regulator.setVehicleType.call(add,typ,{from:App.account});
      if(test){
        const gas = await App.contracts.regulator.setVehicleType.estimateGas(add,typ,{from:App.account});
        App.contracts.regulator.setVehicleType(add, typ, {from: App.account,gas:gas})
        .on("transactionHash",async (hash)=>{
          App.setStatus("Your transaction with Hash"+hash+" is on its way!");
        })
        
        .on("receipt",async(receipt)=>{
          console.log("on reciept...");
          let logs=[];let i=0;
          receipt.logs.forEach(
            function(item){
              logs[i] = item.event;
              i++;
              logs[i] = item.args;
              i++;
            }
          )
          if(receipt.status == 1){
            App.setStatus("Transaction was succesful: "+"<small><samp><pre>"+JSON.stringify(logs, undefined, 1)+"</pre></samp></small>");
            }else{
              App.setStatus("Transaction has failed: "+"<small><samp><pre>"+JSON.stringify(logs, undefined, 1)+"</pre></samp></small>");
            }
              console.log(receipt);
              receipt = null;
      })
        .on("error",async(error)=>{
          App.setStatus("Transaction failed due to: "+error);
        })
      }
    }catch(e){
      console.log(e);
      App.setStatus(e.message);
    }
      /*
      Regulator.deployed().then(function(instance) {
        reg = instance;
        return reg.setVehicleType(add, typ, {from: account});
      }).then(function() {
        App.setStatus("Transaction complete!");
        App.refreshBalance();
      }).catch(function(e) {
        console.log(e);
        App.setStatus("Failed to create vehicle type; see log.");
      });
      */
    },
    handleSetMultiplier: async function() {
      var type = parseInt(document.getElementById("vtype").value);
      var multiplier = parseInt(document.getElementById("vmult").value);
      let e = document.getElementById("tb_select");
      var tollBoothOpAddress = e.options[e.selectedIndex].value;
      App.setStatus("Initiating transaction... (please wait)");
      try{
      let operator = await TollBoothOperator.at(tollBoothOpAddress);
      let result = await operator.setMultiplier.call(type, multiplier, {from: App.account});
      console.log(result);
      let gas = await operator.setMultiplier.estimateGas(type, multiplier, {from: App.account});
      await operator.setMultiplier(type, multiplier, {from: App.account,gas:gas})
      .on("transactionHash",async (hash)=>{
        App.setStatus("Your transaction with Hash"+hash+" is on its way!");
      })
      .on("receipt",async(receipt)=>{
        let logs=[];let i=0;
        receipt.logs.forEach(
          function(item){
            logs[i] = item.event;
            i++;
            logs[i] = item.args;
            i++;
          }
        )
        if(receipt.status == 1){
          App.setStatus("Transaction was succesful: "+"<small><samp><pre>"+JSON.stringify(logs, undefined, 1)+"</pre></samp></small>");
          }else{
            App.setStatus("Transaction has failed: "+"<small><samp><pre>"+JSON.stringify(logs, undefined, 1)+"</pre></samp></small>");
          }
            console.log(receipt);
    })
      .on("error",async(error)=>{
        App.setStatus("Transaction failed due to: "+error);
      })
    }catch(e){
      console.log(e);
      App.setStatus(e.message);
    }
    },
    handleAddTollBooth: async function() {
      var add = document.getElementById("toladd").value;
      let e = document.getElementById("tb_select");
      var tollBoothOpAddress = e.options[e.selectedIndex].value;
      add = App.clean(add);
      console.log(tollBoothOpAddress);
      App.setStatus("Initiating transaction... (please wait)");

      let operator = await TollBoothOperator.at(tollBoothOpAddress);
      try{
      let result = await operator.addTollBooth.call(add,{from:App.account});
      console.log(result);
      if(result){
        let gas = await operator.addTollBooth.estimateGas(add,{from:App.account});
        console.log(gas);
        await operator.addTollBooth(add, {from: App.account,gas:gas})
        .on("transactionHash",async (hash)=>{
          App.setStatus("Your transaction with Hash"+hash+" is on its way!");
        })
        .on("receipt",async(receipt)=>{
          let logs=[];let i=0;
          receipt.logs.forEach(
            function(item){
              logs[i] = item.event;
              i++;
              logs[i] = item.args;
              i++;
            }
          )
          if(receipt.status == 1){
            App.setStatus("Transaction was succesful: "+"<small><samp><pre>"+JSON.stringify(logs, undefined, 1)+"</pre></samp></small>");
            }else{
              App.setStatus("Transaction has failed: "+"<small><samp><pre>"+JSON.stringify(logs, undefined, 1)+"</pre></samp></small>");
            }
              console.log(receipt);
      })
        .on("error",async(error)=>{
          App.setStatus("Transaction failed due to: "+error);
        })
      }
    }catch(e){
      console.log(e);
      App.setStatus(e.message);
    }

      
    },

    handleSetBasPrice: async function() {
      var add1 = document.getElementById("toladd1").value;
      var add2 = document.getElementById("toladd2").value;
      var price = parseInt(document.getElementById("tolPrice").value);
      console.log(add1=App.clean(add1));
      console.log(add2=App.clean(add2));
      console.log(price);
      let e = document.getElementById("tb_select");
      var tollBoothOpAddress = e.options[e.selectedIndex].value;
      console.log(tollBoothOpAddress);
      App.setStatus("Initiating transaction... (please wait)");
      try{
      let operator = await TollBoothOperator.at(tollBoothOpAddress);
      let result = await operator.setRoutePrice.call(add1,add2,price, {from: App.account});
      console.log(result);
      if(result){
        let gas = await operator.setRoutePrice.estimateGas(add1,add2,price, {from: App.account});
        console.log(gas);
        await operator.setRoutePrice(add1,add2,price, {from: App.account,gas:gas})
        .on("transactionHash",async (hash)=>{
          App.setStatus("Your transaction with Hash"+hash+" is on its way!");
        })
        .on("receipt",async(receipt)=>{
          let logs=[];let i=0;
          receipt.logs.forEach(
            function(item){
              logs[i] = item.event;
              i++;
              logs[i] = item.args;
              i++;
            }
          )
          if(receipt.status == 1){
            App.setStatus("Transaction was succesful: "+"<small><samp><pre>"+JSON.stringify(logs, undefined, 1)+"</pre></samp></small>");
            }else{
              App.setStatus("Transaction has failed: "+"<small><samp><pre>"+JSON.stringify(logs, undefined, 1)+"</pre></samp></small>");
            }
              console.log(receipt);
      })
        .on("error",async(error)=>{
          App.setStatus("Transaction failed due to: "+error);
        })
      }
    }catch(e){
      console.log(e);
      App.setStatus(e.message);
    }
    },
    handleGenHash: async function(){
      var secret = document.getElementById("secret").value;
      App.setStatus("Generating your unique hash, it will appear here (please wait)");
      let e = document.getElementById("tb_select1");
      var tollBoothOpAddress = e.options[e.selectedIndex].value;
      console.log(tollBoothOpAddress);
      let fromAscii = await window.web3.utils.fromAscii(secret);
      console.log(fromAscii);
      let operator = await TollBoothOperator.at(tollBoothOpAddress);
      let result = await operator.hashSecret(fromAscii);
      console.log(result);
      App.setStatus(result);
    },
    handleEnterBooth: async function(){
      var amount = parseInt(document.getElementById("entAmt").value);
      var secret = document.getElementById("entSecret").value;
      var booth = document.getElementById("entBooth").value;
      let e = document.getElementById("tb_select1");
      var tollBoothOpAddress = e.options[e.selectedIndex].value;
      console.log("Amount "+amount);
      console.log(secret = App.clean(secret));
      console.log(booth = App.clean(booth));
      console.log("Tool Address "+tollBoothOpAddress);
      
      App.setStatus("Initiating transaction... (please wait)");
      try{
      let operator = await TollBoothOperator.at(tollBoothOpAddress);
      let result = await operator.enterRoad.call(booth,secret,{from:App.account,value:amount});
      console.log(result);
      if(result){
        let gas =  await operator.enterRoad.estimateGas(booth,secret,{from:App.account,value:amount});
        console.log(gas);
        console.log(result);
        console.log(amount);
        await operator.enterRoad.sendTransaction(booth,secret,{from:App.account,value:amount})
        .on("transactionHash",async (hash)=>{
          App.setStatus("Your transaction with Hash"+hash+" is on its way!");
        })
        .on("receipt",async(receipt)=>{
          let logs=[];let i=0;
          receipt.logs.forEach(
            function(item){
              logs[i] = item.event;
              i++;
              logs[i] = item.args;
              i++;
            }
          )
          if(receipt.status == 1){
            App.setStatus("Transaction was succesful: "+"<small><samp><pre>"+JSON.stringify(logs, undefined, 1)+"</pre></samp></small>");
            }else{
              App.setStatus("Transaction has failed: "+"<small><samp><pre>"+JSON.stringify(logs, undefined, 1)+"</pre></samp></small>");
            }
              console.log(receipt);
      })
        .on("error",async(error)=>{
          App.setStatus("Transaction failed due to: "+error);
        })
        .on("Error",async(error)=>{
          App.setStatus("Transaction failed due to: "+error);
        })
        App.getVehicleBalance();
    }
  }catch(e){
    console.log(e);
    App.setStatus(e.message);
  }
  },
    handleGetExitHistory: async function(){
      //"LogRoadEntered"
      //LogRoadExited
      let e = document.getElementById("tb_select1");
      var tollBoothOpAddress = e.options[e.selectedIndex].value;
      const operator = await TollBoothOperator.at(tollBoothOpAddress);
      const entries = await operator.getPastEvents('LogRoadEntered', {
        filter: {vehicle: App.account},
        fromBlock: 0,
        toBlock: 'latest'
        });

        const exits = await operator.getPastEvents('LogRoadExited', {
          filter: {vehicle: App.account},
          fromBlock: 0,
          toBlock: 'latest'
          });
      console.log(entries);
      if(entries.length <1){
        $("#entryhistory").html("You do not have any entry history yet");
      }else{

        let logs=[];let i=0;
          entries.forEach(
            function(item){
              logs[i] = item.args;
              i++;
            }
          )
        document.getElementById("entryhistory").innerHTML = "<small><samp><pre>"+JSON.stringify(logs, undefined, 1)+"</pre></samp></small>";
      }

      if(exits.length <1){
        $("#exithistory").html("You do not have any exit history yet");
      }else{

        let logs=[];let i=0;
        exits.forEach(
            function(item){
              logs[i] = item.args;
              i++;
            }
          )
        
          document.getElementById("exithistory").innerHTML = "<small><samp><pre>"+JSON.stringify(logs, undefined, 2)+"</pre></samp></small>";
      }
    },
    handleReportExit: async function(){
      var secret = document.getElementById("exitsecret").value;
      secret = App.clean(secret);
      secret = await window.web3.utils.fromAscii(secret);
      let e = document.getElementById("tb_select2");
      var tollBoothOpAddress = e.options[e.selectedIndex].value;

      try{
        const operator = await TollBoothOperator.at(tollBoothOpAddress);
        let result = await operator.reportExitRoad.call(secret,{from:App.account});
        console.log(result);
        if(result){
          let gas =  await operator.reportExitRoad.estimateGas(secret,{from:App.account});
          console.log(gas);
          console.log(result);
          await operator.reportExitRoad(secret,{from:App.account})
          .on("transactionHash",async (hash)=>{
            App.setStatus("Your transaction with Hash"+hash+" is on its way!");
          })
          .on("receipt",async(receipt)=>{
            let logs=[];let i=0;
            receipt.logs.forEach(
              function(item){
                logs[i] = item.event;
                i++;
                logs[i] = item.args;
                i++;
              }
            )
            if(receipt.status == 1){
              App.setStatus("Transaction succesful:"+"<small><samp><pre>"+JSON.stringify(logs, undefined, 1)+"</pre></samp></small>");
              document.getElementById("report_here").innerHTML = "<small><samp><pre>"+JSON.stringify(logs, undefined, 1)+"</pre></samp></small>";
              }else{
                App.setStatus("Transaction failed:"+"<small><samp><pre>"+JSON.stringify(logs, undefined, 1)+"</pre></samp></small>");
              }
        })
          .on("error",async(error)=>{
            App.setStatus("Transaction failed due to: "+error);
          })
          .on("Error",async(error)=>{
            App.setStatus("Transaction failed due to: "+error);
          })
          App.getVehicleBalance();
      }
    }catch(e){
      console.log(e);
      App.setStatus(e.message);
    }
    }
}
  
  window.addEventListener('load', function() {
    /*
    // Checking if Web3 has been injected by the browser (Mist/MetaMask)
    if (typeof window.web3  !== 'undefined') {
      console.warn("Using web3 detected from external source. If you find that your accounts don't appear or you have 0 MetaCoin, ensure you've configured that source properly. If using MetaMask, see the following link. Feel free to delete this warning. :) http://truffleframework.com/tutorials/truffle-and-metamask")
      // Use Mist/MetaMask's provider
      window.web3 = new Web3(web3.currentProvider);
    } else {
      console.warn("No web3 detected. Falling back to http://localhost:8545. You should remove this fallback when you deploy live, as it's inherently insecure. Consider switching to Metamask for development. More info here: http://truffleframework.com/tutorials/truffle-and-metamask");
      // fallback - use your fallback strategy (local node / hosted node + in-dapp id mgmt / fail)
      window.web3 = new Web3(new Web3.providers.HttpProvider("http://localhost:8545"));
    }*/
    

    //window.web3 = new Web3(new Web3.providers.HttpProvider("http://localhost:8545"));
  
    App.init();
  });
  