"use client"

import { AnchorProvider, Program } from "@project-serum/anchor";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey, SystemProgram } from "@solana/web3.js";

import { useState } from "react";
import { useEffect } from "react";

const PROGRAM_ID = new PublicKey("EuXGJJMr69HGJycN5TMNF7ek3d1fxMSKMpqFbWqMmeH7")
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
}



export default function Home() {
  const { connection } = useConnection();
  const wallet = useWallet();
  const [notes, setNotes] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")
  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [editTile, setEditTitle] = useState("")
  const [editContent, setEditContent] = useState("")
  const getProgram = () => {
    if (!wallet.publicKey || !wallet.signTransaction) return null;
    const provider = new AnchorProvider(connection, wallet as any, {})
    return new Program(IDL as any, PROGRAM_ID, provider)
  }


  const getNoteAddress = (title: String) => {
    if (!wallet.publicKey || !wallet.signTransaction) return null;
    const [noteAddress] = PublicKey.findProgramAddressSync([

      Buffer.from("note"),
      wallet.publicKey.toBuffer(),
      Buffer.from(title)


    ], PROGRAM_ID)

    return noteAddress;
  }
  //load the note

  const loadNotes = async () => {
    if (!wallet.publicKey) return;
    try {
      const program = getProgram()
      if (!program) return;
      setLoading(true)
      const notes = await program.account.note.all(
        [
          {
            memcmp: {
              offset: 8, //account:Note:{author ,title ,con}
              bytes: wallet.publicKey.toBase58(),


            }
          }

        ]);
      setNotes(notes)
      setMessage("")
      console.log(notes)
    } catch (error) {
      setMessage("Error Loading the notes")
    }
    setLoading(false)
  }
  //create the note
  const createNote = async () => {
    if (!title.trim() || !title.trim()) {
      setMessage("Please fill the title and the content")
    }

    if (title.length > 100) {
      setMessage("Title is too long :100 char Max")
    }
    if (content.length > 100) {
      setMessage("Content is too long :1000 char Max")
    }
    setLoading(true)
    try {
      const program = getProgram();
      if (!program) return;
      const noteAddress = getNoteAddress(title)
      if (!noteAddress) return
      await program.methods.createNote(title, content).accounts({
        noteAccount: noteAddress,
        author: wallet.publicKey,
        systemProgram: SystemProgram.programId

      }

      ).rpc()
      setMessage("Note Create Successfully")
      setLoading(false)
      setTitle("")
      setContent("")
    } catch (error) {
      console.log("Error creating note", error)
      setMessage("Error creating note")
      await loadNotes()
    }

    setLoading(false)

  }

  //upate note
  const updateNote = async (note: any) => {
    if (!editContent.trim()) {
      setMessage("Content Cannot be Empty")
      return;
    }
    if (editContent.length > 1000) {
      setMessage("Content tO long Max: 1000 chars")
      return;
    }
    setLoading(true)
    try {
      const program = getProgram();
      if (!program) return;
      const noteAddress = getNoteAddress(note.account.title)
      if (!noteAddress) return
      await program.methods.updateNote(editContent).accounts({
        note: noteAddress,
        author: wallet.publicKey
      }).rpc()
      setMessage("Note update sucessfully")
      setEditContent("")
      setEditTitle("")
      await loadNotes()
    } catch (error) {
      console.log("Error updating notes", error)
      setMessage("Erro updating notes")
    }
    setLoading(false)
  }

  //delete the note

  const deleteNote = async (note: any) => {
    setLoading(true)
    try {
      const program = getProgram();
      if (!program) return;
      const noteAddress = getNoteAddress(note.account.title)
      if (!noteAddress) return
      await program.methods.deleteNote().accounts({
        note: noteAddress,
        author: wallet.publicKey
      }).rpc();

      setMessage("Note delete successfully");
      await loadNotes()


    } catch (error) {
      console.log("Error deleting note", error)
      setMessage("Error deleting the note")
    }
    setLoading(false)
  }
  useEffect(() => {
    if (wallet.connected) {
      loadNotes()
    }
  }, [wallet.connected]);

  if (!wallet.connected) {
    return <div className="text-gray-700">Wallet is not connected please Connect your wallet </div>
  }

  return (

    <div className="text-gray-700">
      <div>
        <h2 className="text-2xl mb-6">Create New Note</h2>
         {/* for  title */}
        <div className="mb-4">
                  <label className="text-sm block font-medium">
  Title (
  {title.length > 100? <div className="inline text-red-500">Limit Exceed</div> : `${title.length.toLocaleString()}/100`}
  
  )
</label>
<input 
type="text"
 name="title"
  value={title} 
  placeholder="Title here ..."
  onChange={(e)=>setTitle(e.target.value)}
  className="border-2 border-gray-300 rounded-lg p-2 w-full"

/>
        </div>

        {/* for content */}
                <div className="mb-4">
                  <label className="text-sm block font-medium">
  Content (
  {content.length > 1000? <div className="inline text-red-500">Limit Exceed</div> : `${content.length.toLocaleString()}/100`}
  
  )
</label>

<textarea 
maxLength={1000}
 name="content"
  value={content}
  placeholder="Content Here ..."
  rows={5} 
  onChange={(e)=>setContent(e.target.value)}
  className=" border-2 border-gray-300 rounded-lg p-2 w-full"

/>
        </div>
        <button
        className="w-full bg-blue-500 rounded-lg text-white font-bold px-4 py-2  cursor-ponter disabled:bg-blue-300 disabled:cursor-not-allowed"
        disabled={loading || !title.trim() ||!content.trim() }
        onClick={createNote}
        >
          
          {loading ?"Creating note ..": "Create Note"}
        
        </button>
      </div>
      <div>
        {notes?.map((note: any, index: number) => {
          return <div>
<div>{JSON.stringify(note)}</div>
          </div>
        })}
      </div>
    </div>


  );
}
