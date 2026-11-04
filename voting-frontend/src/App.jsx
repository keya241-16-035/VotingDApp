import { useState } from "react";
import { BrowserProvider, Contract } from "ethers";
import votingArtifact from "./contracts/Voting.json";
import "./App.css";

const CONTRACT_ADDRESS =
  "0x5FbDB2315678afecb367f032d93F642f64180aa3";
const ABI = votingArtifact.abi;

function App() {
  const [account, setAccount] = useState("");
  const [candidates, setCandidates] = useState([]);
  const [message, setMessage] = useState(
    "Connect your wallet to view candidates."
  );
  const [busy, setBusy] = useState(false);

  async function connectWallet() {
    try {
      if (!window.ethereum) {
        setMessage("MetaMask is not detected. Please install it first.");
        return;
      }
      const provider = new BrowserProvider(window.ethereum);
      const network = await provider.getNetwork();
      if (network.chainId !== 31337n) {
        setMessage(
          "Please switch MetaMask to Hardhat Local (Chain ID 31337)."
        );
        return;
      }
      const accounts = await provider.send("eth_requestAccounts", []);
      setAccount(accounts[0]);
      await loadCandidates(provider);
      setMessage("Wallet connected successfully.");
    } catch (error) {
      setMessage(error.shortMessage || error.message);
    }
  }

  async function loadCandidates(existingProvider) {
    try {
      const provider =
        existingProvider || new BrowserProvider(window.ethereum);
      const voting = new Contract(CONTRACT_ADDRESS, ABI, provider);
      const count = await voting.candidateCount();
      const result = [];
      for (let id = 1n; id <= count; id++) {
        const candidate = await voting.candidates(id);
        result.push({
          id: Number(candidate.id),
          name: candidate.name,
          voteCount: candidate.voteCount.toString(),
        });
      }
      setCandidates(result);
    } catch (error) {
      setMessage(error.shortMessage || error.message);
    }
  }

  async function castVote(candidateId) {
    if (!window.ethereum) {
      setMessage("Please install MetaMask first.");
      return;
    }
    try {
      setBusy(true);
      setMessage("Please approve the transaction in MetaMask.");
      const provider = new BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const voting = new Contract(CONTRACT_ADDRESS, ABI, signer);
      const alreadyVoted = await voting.hasVoted(
        await signer.getAddress()
      );
      if (alreadyVoted) {
        setMessage("This wallet has already voted.");
        return;
      }
      const tx = await voting.vote(candidateId);
      setMessage(`Transaction submitted: ${tx.hash}`);
      await tx.wait();
      setMessage("Vote confirmed successfully!");
      await loadCandidates(provider);
    } catch (error) {
      setMessage(
        error.shortMessage ||
          error.reason ||
          error.message ||
          "The transaction failed."
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="app">
      <h1>Blockchain Voting DApp</h1>
      <p>Vote for your preferred candidate on the local blockchain.</p>
      <button onClick={connectWallet} disabled={busy}>
        {account ? "Wallet Connected" : "Connect MetaMask"}
      </button>
      {account && (
        <p className="account">
          <strong>Account:</strong> {account}
        </p>
      )}
      <p className="message">{message}</p>
      <button
        className="refresh"
        onClick={() => loadCandidates()}
        disabled={busy}
      >
        Refresh Candidates
      </button>
      <section className="candidates">
        {candidates.map((candidate) => (
          <article className="candidate" key={candidate.id}>
            <h2>{candidate.name}</h2>
            <p>Candidate ID: {candidate.id}</p>
            <p>Votes: {candidate.voteCount}</p>
            <button
              onClick={() => castVote(candidate.id)}
              disabled={!account || busy}
            >
              Vote for {candidate.name}
            </button>
          </article>
        ))}
      </section>
      <footer>
        <small>Local development network · Chain ID 31337</small>
      </footer>
    </main>
  );
}

export default App;
