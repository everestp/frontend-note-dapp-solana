"use client"

import { AnchorProvider, Program } from "@project-serum/anchor";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey, SystemProgram } from "@solana/web3.js";

import { useState, useEffect } from "react";

const PROGRAM_ID = new PublicKey("EuXGJJMr69HGJycN5TMNF7ek3d1fxMSKMpqFbWqMmeH7");

const IDL = {
  "version": "0.1.0",
  "name": "note_dapp",
  "constants": [
    { "name": "NOTE_SEED", "type": "bytes", "value": "[110, 111, 116, 101]" },
    { "name": "POST_SEED", "type": "bytes", "value": "[112, 111, 115, 116]" }
  ],
  "instructions": [
    {
      "name": "createNote",
      "accounts": [
        { "name": "noteAccount", "isMut": true, "isSigner": false },
        { "name": "author", "isMut": true, "isSigner": true },
        { "name": "systemProgram", "isMut": false, "isSigner": false }
      ],
      "args": [
        { "name": "title", "type": "string" },
        { "name": "content", "type": "string" }
      ]
    },
    {
      "name": "updateNote",
      "accounts": [
        { "name": "noteAccount", "isMut": true, "isSigner": false },
        { "name": "author", "isMut": false, "isSigner": true }
      ],
      "args": [
        { "name": "updateContent", "type": "string" }
      ]
    },
    {
      "name": "deleteNote",
      "accounts": [
        { "name": "noteAccount", "isMut": true, "isSigner": false },
        { "name": "author", "isMut": true, "isSigner": true }
      ],
      "args": []
    }
  ],
  "accounts": [
    {
      "name": "Note",
      "type": {
        "kind": "struct",
        "fields": [
          { "name": "author", "type": "publicKey" },
          { "name": "title", "type": "string" },
          { "name": "content", "type": "string" },
          { "name": "createdAt", "type": "i64" },
          { "name": "lastUpdate", "type": "i64" }
        ]
      }
    }
  ],
  "errors": [
    { "code": 6000, "name": "TitleTooLong", "msg": "Title cannot be longer than 100 chars" },
    { "code": 6001, "name": "ContentTooLong", "msg": "Content cannot be longer than 1000 chars" },
    { "code": 6002, "name": "TitleEmpty", "msg": "Title cannot be empty" },
    { "code": 6003, "name": "ContentEmpty", "msg": "Content cannot be empty" },
    { "code": 6004, "name": "Unauthorized", "msg": "Unauthorized" }
  ]
};

export default function Home() {
  const { connection } = useConnection();
  const wallet = useWallet();

  const [notes, setNotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editNote ,setEditNote] = useState(null)
  const getProgram = () => {
    if (!wallet.publicKey || !wallet.signTransaction) return null;
    const provider = new AnchorProvider(connection, wallet as any, {});
    return new Program(IDL as any, PROGRAM_ID, provider);
  };

  const getNoteAddress = (title: string) => {
    if (!wallet.publicKey || !wallet.signTransaction) return null;
    const [noteAddress] = PublicKey.findProgramAddressSync(
      [Buffer.from("note"), wallet.publicKey.toBuffer(), Buffer.from(title)],
      PROGRAM_ID
    );
    return noteAddress;
  };

  // Load Notes
  const loadNotes = async () => {
    if (!wallet.publicKey) return;
    try {
      const program = getProgram();
      if (!program) return;
      setLoading(true);
      const notes = await program.account.note.all([
        {
          memcmp: {
            offset: 8, // first 8 bytes = discriminator
            bytes: wallet.publicKey.toBase58(),
          },
        },
      ]);
      setNotes(notes);
      setMessage("");
      console.log(notes);
    } catch (error) {
      setMessage("Error loading notes");
    }
    setLoading(false);
  };

  // Create Note
  const createNote = async () => {
    if (!title.trim() || !content.trim()) {
      setMessage("Please fill the title and the content");
      return;
    }

    if (title.length > 100) {
      setMessage("Title is too long: 100 char max");
      return;
    }
    if (content.length > 1000) {
      setMessage("Content is too long: 1000 char max");
      return;
    }

    setLoading(true);
    try {
      const program = getProgram();
      if (!program) return;
      const noteAddress = getNoteAddress(title);
      if (!noteAddress) return;

      await program.methods
        .createNote(title, content)
        .accounts({
          noteAccount: noteAddress,
          author: wallet.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      setMessage("Note created successfully");
      setTitle("");
      setContent("");
      await loadNotes();
    } catch (error) {
      console.log("Error creating note", error);
      setMessage("Error creating note");
    }
    setLoading(false);
  };

  // Update Note
  const updateNote = async (note: any) => {
    if (!editContent.trim()) {
      setMessage("Content cannot be empty");
      return;
    }
    if (editContent.length > 1000) {
      setMessage("Content too long: 1000 chars max");
      return;
    }
    setLoading(true);
    try {
      const program = getProgram();
      if (!program) return;
      const noteAddress = getNoteAddress(note.account.title);
      if (!noteAddress) return;

      await program.methods
        .updateNote(editContent)
        .accounts({
          noteAccount: noteAddress,
          author: wallet.publicKey,
        })
        .rpc();

      setMessage("Note updated successfully");
      setEditContent("");
      setEditTitle("");
      await loadNotes();
    } catch (error) {
      console.log("Error updating note", error);
      setMessage("Error updating note");
    }
    setLoading(false);
  };

  // Delete Note
  const deleteNote = async (note: any) => {
    setLoading(true);
    try {
      const program = getProgram();
      if (!program) return;
      const noteAddress = getNoteAddress(note.account.title);
      if (!noteAddress) return;

      await program.methods
        .deleteNote()
        .accounts({
          noteAccount: noteAddress,
          author: wallet.publicKey,
        })
        .rpc();

      setMessage("Note deleted successfully");
      await loadNotes();
    } catch (error) {
      console.log("Error deleting note", error);
      setMessage("Error deleting note");
    }
    setLoading(false);
  };

  // Dicebear avatar generator
  const dicebearUrl = (seed: string) =>
    `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(seed)}`;

  useEffect(() => {
    if (wallet.connected) {
      loadNotes();
    }
  }, [wallet.connected]);

  if (!wallet.connected) {
    return <div className="text-gray-700">Wallet is not connected. Please connect your wallet.</div>;
  }

  return (
    <div className="text-gray-700">
      <div>
        <h2 className="text-2xl mb-6">Create New Note</h2>

        {/* Title */}
        <div className="mb-4">
          <label className="text-sm block font-medium">
            Title (
            {title.length > 100 ? (
              <span className="inline text-red-500">Limit Exceeded</span>
            ) : (
              `${title.length}/100`
            )}
            )
          </label>
          <input
            type="text"
            name="title"
            value={title}
            placeholder="Title here ..."
            onChange={(e) => setTitle(e.target.value)}
            className="border-2 border-gray-300 rounded-lg p-2 w-full"
          />
        </div>

        {/* Content */}
        <div className="mb-4">
          <label className="text-sm block font-medium">
            Content (
            {content.length > 1000 ? (
              <span className="inline text-red-500">Limit Exceeded</span>
            ) : (
              `${content.length}/1000`
            )}
            )
          </label>
          <textarea
            maxLength={1000}
            name="content"
            value={content}
            placeholder="Content here ..."
            rows={5}
            onChange={(e) => setContent(e.target.value)}
            className="border-2 border-gray-300 rounded-lg p-2 w-full"
          />
        </div>

        <button
          className="w-full bg-blue-500 rounded-lg text-white font-bold px-4 py-2 cursor-pointer disabled:bg-blue-300 disabled:cursor-not-allowed"
          disabled={loading || !title.trim() || !content.trim()}
          onClick={createNote}
        >
          {loading ? "Creating note..." : "Create Note"}
        </button>
      </div>

      {/* Notes List */}
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-8">
  {notes?.map((note) => {
    const createdAt = note.account.createdAt
      ? new Date(note.account.createdAt.toNumber() * 1000).toLocaleString()
      : "N/A";

    const updatedAt = note.account.updatedAt
      ? new Date(note.account.updatedAt.toNumber() * 1000).toLocaleString()
      : "N/A";

    return (
      <div
        key={note.publicKey.toBase58()}
        className="rounded-xl shadow p-4 border bg-white space-y-3 flex flex-col justify-between"
      >
        {/* Header */}
        <div className="flex items-center gap-3">
          <img
            src={dicebearUrl(note.account.author.toBase58())}
            alt="avatar"
            className="w-10 h-10 rounded-full"
          />
          <div>
            <h3 className="font-semibold text-sm">{note.account.title}</h3>
            <p className="text-xs text-gray-500">{note.account.author.toBase58()}</p>
          </div>
        </div>

        {/* Content */}
        <p className="text-sm text-gray-600 line-clamp-4">{note.account.content}</p>

        {/* Timestamps */}
        <div className="text-[11px] text-gray-400 space-y-1">
          <p>Created: {createdAt}</p>
          <p>Updated: {updatedAt}</p>
        </div>
        {
          editNote ? <div>
 <textarea
            maxLength={1000}
            name="content"
            value={editContent}
            placeholder="Content here ..."
            rows={5}
            onChange={(e) => setEditContent(e.target.value)}
            className="border-2 border-gray-300 rounded-lg p-2 w-full"
          />    
          <div className="flex flex-row gap-3 ">
    <button
            onClick={() => {
              updateNote(note)
              setEditNote(null)
            }}
            className="px-3 py-1 text-xs rounded-lg bg-green-500 text-white hover:bg-blue-600"
          >
            Update
          </button>  
            <button
            onClick={() => {
            
              setEditNote(null)
            }}
            className="px-3 py-1 text-xs rounded-lg bg-red-500 text-white hover:bg-blue-600"
          >
            Cancle
          </button>  
          </div>
           
           </div> : null
        }

        {/* Actions */}
        {
      !editNote &&  <div className="flex justify-end gap-2 pt-2">
          <button
            onClick={() => {
              setEditNote(note)
              setEditContent(note.account.content)
            }}
            className="px-3 py-1 text-xs rounded-lg bg-blue-500 text-white hover:bg-blue-600"
          >
            Edit
          </button>
          <button
            onClick={() => deleteNote(note.publicKey)}
            className="px-3 py-1 text-xs rounded-lg bg-red-500 text-white hover:bg-red-600"
          >
            Delete
          </button>
        </div>

        }
      </div>
    );
  })}
</div>



    </div>
  );
}
