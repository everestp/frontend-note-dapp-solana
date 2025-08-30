"use client";
import { AnchorProvider, Program } from "@project-serum/anchor";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import { useState, useEffect } from "react";

const PROGRAM_ID = new PublicKey("EuXGJJMr69HGJycN5TMNF7ek3d1fxMSKMpqFbWqMmeH7");
const IDL = {
  "version": "0.1.0",
  "name": "note_dapp",
  "constants": [
    {
      "name": "NOTE_SEED",
      "type": "bytes",
      "value": "[110, 111, 116, 101]"
    },
    {
      "name": "POST_SEED",
      "type": "bytes",
      "value": "[112, 111, 115, 116]"
    }
  ],
  "instructions": [
    {
      "name": "createNote",
      "accounts": [
        {
          "name": "noteAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "author",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "title",
          "type": "string"
        },
        {
          "name": "content",
          "type": "string"
        }
      ]
    },
    {
      "name": "updateNote",
      "accounts": [
        {
          "name": "noteAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "author",
          "isMut": false,
          "isSigner": true
        }
      ],
      "args": [
        {
          "name": "updateContent",
          "type": "string"
        }
      ]
    },
    {
      "name": "deleteNote",
      "accounts": [
        {
          "name": "noteAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "author",
          "isMut": true,
          "isSigner": true
        }
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
          {
            "name": "author",
            "type": "publicKey"
          },
          {
            "name": "title",
            "type": "string"
          },
          {
            "name": "content",
            "type": "string"
          },
          {
            "name": "createdAt",
            "type": "i64"
          },
          {
            "name": "lastUpdate",
            "type": "i64"
          }
        ]
      }
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "TitleTooLong",
      "msg": "Title cannot be longer than 100 chars"
    },
    {
      "code": 6001,
      "name": "ContentTooLong",
      "msg": "Content cannot be longer than 1000 chars"
    },
    {
      "code": 6002,
      "name": "TitleEmpty",
      "msg": "Title cannot be empty"
    },
    {
      "code": 6003,
      "name": "ContentEmpty",
      "msg": "Content cannot be empty"
    },
    {
      "code": 6004,
      "name": "Unauthorized",
      "msg": "Unauthorized"
    }
  ]
}
export default function Home() {
  const { connection } = useConnection();
  const wallet = useWallet();

  /* eslint-disable @typescript-eslint/no-explicit-any */
  const [notes, setNotes] = useState<any[]>([]);
  const [loadingCreate, setLoadingCreate] = useState(false);
  const [loadingUpdate, setLoadingUpdate] = useState<string | null>(null);
  const [loadingDelete, setLoadingDelete] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editNote, setEditNote] = useState<string | null>(null);

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
const loadNotes = async () => {
  if (!wallet.publicKey) return;
  try {
    const program = getProgram();
    if (!program) return;
    setMessage("");
    const notes = await program.account.note.all([
      {
        memcmp: {
          offset: 8,
          bytes: wallet.publicKey.toBase58(),
        },
      },
    ]);

    // Sort the notes by timestamp in descending order
    // Note: The `account` property contains the deserialized note data
    notes.sort((a, b) => b.account.createdAt - a.account.createdAt);

    setNotes(notes);
  } catch (error) {
    setMessage("Error loading notes");
    console.error(error);
  }
};

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
    setLoadingCreate(true);
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
      console.error("Error creating note", error);
      setMessage("Error creating note");
    }
    setLoadingCreate(false);
  };

  const updateNote = async (note: any) => {
    if (!editContent.trim()) {
      setMessage("Content cannot be empty");
      return;
    }
    if (editContent.length > 1000) {
      setMessage("Content too long: 1000 chars max");
      return;
    }
    setLoadingUpdate(note.publicKey.toBase58());
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
      setEditNote(null);
      await loadNotes();
    } catch (error) {
      console.error("Error updating note", error);
      setMessage("Error updating note");
    }
    setLoadingUpdate(null);
  };

  const deleteNote = async (note: any) => {
    setLoadingDelete(note.publicKey.toBase58());
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
      if (editNote === note.publicKey.toBase58()) {
        setEditNote(null);
        setEditContent("");
      }
      await loadNotes();
    } catch (error) {
      console.error("Error deleting note", error);
      setMessage("Error deleting note");
    }
    setLoadingDelete(null);
  };

  const dicebearUrl = (seed: string) =>
    `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(seed)}`;

  // Deeper, more saturated color palette
  const cardColors = [
    "bg-red-200",
    "bg-orange-200",
    "bg-yellow-200",
    "bg-lime-200",
    "bg-emerald-200",
    "bg-cyan-200",
    "bg-sky-200",
    "bg-indigo-200",
    "bg-fuchsia-200",
  ];

  useEffect(() => {
    if (wallet.connected) {
      loadNotes();
    }
  }, [wallet.connected]);

  if (!wallet.connected) {
    return <div className="min-h-screen grid place-items-center text-xl text-gray-700 p-4">Wallet is not connected. Please connect your wallet to start.</div>;
  }

  return (
    <div className="bg-gray-100 min-h-screen w-full px-4 py-8 md:px-8 font-sans">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl md:text-5xl font-extrabold text-center mb-10 text-gray-900 select-none">
          My Solana Notes
        </h1>

        <div className="w-full max-w-2xl mx-auto mb-12 p-6 md:p-8 bg-white rounded-2xl shadow-xl border border-gray-200 transform hover:scale-[1.01] transition-transform duration-300">
          <h2 className="text-2xl md:text-3xl font-semibold mb-6 text-gray-800 select-none">Create a New Note</h2>

          <label className="block mb-2 font-medium text-gray-700 select-none" htmlFor="note-title">
            Title{" "}
            <span
              className={`text-sm ${
                title.length > 100 ? "text-red-600" : "text-gray-500"
              }`}
            >
              ({title.length}/100)
            </span>
          </label>
          <input
            id="note-title"
            type="text"
            maxLength={100}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter the title..."
            className={`w-full rounded-lg border px-4 py-3 mb-5 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-4 focus:ring-blue-400/50 transition duration-300 ${
              title.length > 100 ? "border-red-500 ring-red-400" : "border-gray-300"
            }`}
          />

          <label className="block mb-2 font-medium text-gray-700 select-none" htmlFor="note-content">
            Content{" "}
            <span
              className={`text-sm ${
                content.length > 1000 ? "text-red-600" : "text-gray-500"
              }`}
            >
              ({content.length}/1000)
            </span>
          </label>
          <textarea
            id="note-content"
            maxLength={1000}
            rows={5}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Write your note content here..."
            className={`w-full rounded-lg border px-4 py-3 mb-5 text-gray-900 placeholder-gray-400 resize-none focus:outline-none focus:ring-4 focus:ring-blue-400/50 transition duration-300 ${
              content.length > 1000 ? "border-red-500 ring-red-400" : "border-gray-300"
            }`}
          />

          <button
            disabled={
              loadingCreate ||
              !title.trim() ||
              !content.trim() ||
              title.length > 100 ||
              content.length > 1000
            }
            onClick={createNote}
            className={`w-full py-3 rounded-lg font-semibold text-white shadow-md transition duration-300 
              ${
                loadingCreate
                  ? "bg-blue-300 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-700 hover:shadow-lg"
              }`}
          >
            {loadingCreate ? "Creating note..." : "Create Note"}
          </button>

          {message && (
            <p className="mt-4 text-center text-sm font-medium text-red-600 select-none">{message}</p>
          )}
        </div>

        {/* Notes List */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {notes.length === 0 && (
            <p className="text-center col-span-full text-lg text-gray-600 mt-10 select-none">
              You have no notes yet. Create some above!
            </p>
          )}
          {notes.map((note, idx) => {
            const createdAt = note.account.createdAt
              ? new Date(note.account.createdAt.toNumber() * 1000).toLocaleString()
              : "N/A";
            const updatedAt = note.account.lastUpdate
              ? new Date(note.account.lastUpdate.toNumber() * 1000).toLocaleString()
              : "N/A";

            const noteKey = note.publicKey.toBase58();
            const bgColor = cardColors[idx % cardColors.length];
            const isEditingThis = editNote === noteKey;

            return (
              <div
                key={noteKey}
                className={`flex flex-col rounded-3xl p-6 shadow-lg border border-gray-300 ${bgColor} min-h-[350px] transform hover:scale-[1.03] transition-transform duration-300 relative`}
              >
                {/* Header */}
                <div className="flex items-center gap-3 mb-4">
                  <img
                    src={dicebearUrl(note.account.author.toBase58())}
                    alt="avatar"
                    className="w-14 h-14 rounded-full border-4 border-white shadow-lg"
                  />
                  <div className="flex flex-col min-w-0">
                    <h3 className="font-bold text-xl truncate text-gray-900 select-text">{note.account.title}</h3>
                    <p className="text-sm text-gray-700 select-text truncate">{note.account.author.toBase58()}</p>
                  </div>
                </div>

                {/* Content / Editable Textarea */}
                <div className="flex-grow">
                  {!isEditingThis && (
                    <p className="text-gray-800 text-base whitespace-pre-wrap break-words line-clamp-6 select-text">
                      {note.account.content}
                    </p>
                  )}
                  {isEditingThis && (
                    <textarea
                      maxLength={1000}
                      rows={6}
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      className="resize-none w-full rounded-lg border border-gray-400 p-3 mb-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                    />
                  )}
                </div>

                {/* Timestamps */}
                <div className="text-[12px] text-gray-600 mt-4 select-none">
                  <p>Created: {createdAt}</p>
                  <p>Updated: {updatedAt}</p>
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-3 mt-4">
                  {isEditingThis ? (
                    <>
                      <button
                        onClick={() => updateNote(note)}
                        disabled={loadingUpdate === noteKey || !editContent.trim()}
                        className={`px-4 py-2 rounded-full font-semibold text-white shadow transition duration-300
                          ${
                            loadingUpdate === noteKey || !editContent.trim()
                              ? "bg-green-300 cursor-not-allowed"
                              : "bg-green-600 hover:bg-green-700"
                          }`}
                      >
                        {loadingUpdate === noteKey ? "Updating..." : "Save"}
                      </button>
                      <button
                        onClick={() => {
                          setEditNote(null);
                          setEditContent("");
                          setMessage("");
                        }}
                        className="px-4 py-2 rounded-full font-semibold bg-gray-500 text-white hover:bg-gray-600 shadow transition duration-300"
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => {
                          setEditNote(noteKey);
                          setEditContent(note.account.content);
                          setMessage("");
                        }}
                        className="px-4 py-2 rounded-full font-semibold bg-blue-600 text-white hover:bg-blue-700 shadow transition duration-300"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => deleteNote(note)}
                        disabled={loadingDelete === noteKey}
                        className={`px-4 py-2 rounded-full font-semibold text-white shadow transition duration-300 ${
                          loadingDelete === noteKey
                            ? "bg-red-300 cursor-not-allowed"
                            : "bg-red-600 hover:bg-red-700"
                        }`}
                      >
                        {loadingDelete === noteKey ? "Deleting..." : "Delete"}
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
