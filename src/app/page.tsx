import { AnchorProvider, Program } from "@project-serum/anchor";
import { WalletReadyState } from "@solana/wallet-adapter-base";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { ClientPageRoot } from "next/dist/client/components/client-page";
import { getWaitUntilPromiseFromEvent } from "next/dist/server/web/spec-extension/fetch-event";
import Image from "next/image";
import { use, useState } from "react";
  
const PROGRAM_ID = new PublicKey("EuXGJJMr69HGJycN5TMNF7ek3d1fxMSKMpqFbWqMmeH7")
const IDL ={"version":"0.1.0","name":"note_dapp","constants":[{"name":"NOTE_SEED","type":"bytes","value":"[110, 111, 116, 101]"},{"name":"POST_SEED","type":"bytes","value":"[112, 111, 115, 116]"}],"instructions":[{"name":"createNote","accounts":[{"name":"noteAccount","isMut":true,"isSigner":false},{"name":"author","isMut":true,"isSigner":true},{"name":"systemProgram","isMut":false,"isSigner":false}],"args":[{"name":"title","type":"string"},{"name":"content","type":"string"}]},{"name":"updateNote","accounts":[{"name":"noteAccount","isMut":true,"isSigner":false},{"name":"author","isMut":false,"isSigner":true}],"args":[{"name":"updateContent","type":"string"}]},{"name":"deleteNote","accounts":[{"name":"noteAccount","isMut":true,"isSigner":false},{"name":"author","isMut":true,"isSigner":true}],"args":[]}],"accounts":[{"name":"Note","type":{"kind":"struct","fields":[{"name":"author","type":"publicKey"},{"name":"title","type":"string"},{"name":"content","type":"string"},{"name":"createdAt","type":"i64"},{"name":"lastUpdate","type":"i64"}]}}],"errors":[{"code":6000,"name":"TitleTooLong","msg":"Title cannot be longer than 100 chars"},{"code":6001,"name":"ContentTooLong","msg":"Content cannot be longer than 1000 chars"},{"code":6002,"name":"TitleEmpty","msg":"Title cannot be empty"},{"code":6003,"name":"ContentEmpty","msg":"Content cannot be empty"},{"code":6004,"name":"Unauthorized","msg":"Unauthorized"}]}



export default function Home() {
  const {connection} = useConnection();
  const wallet = useWallet();
const [notes ,setNotes] =  useState<any []>([])
const [loading ,setLoading]=  useState(false)

  const  getProgram = ()=>{
    if(!wallet.publicKey || !wallet.signTransaction) return null;
    const provider = new AnchorProvider(connection , wallet as any ,{})
    return new Program(IDL as any , PROGRAM_ID ,provider)
  }

  //load the note

  const loadNotes = async () =>{
    if (!wallet.publicKey) return;
     try {
      const  program = getProgram()
      if(!program) return;
  setLoading(true)
      const notes = await program.account.note_account.all(
        [
          {
            memcmp :{
              offset : 8 , //account:Note:{author ,title ,con}
              bytes :wallet.publicKey.toBase58(),


            }
          }

        ]);
        setNotes(notes)
        console.log(notes)
     } catch (error) {
      
     }
     setLoading(false)
  }
  //create the note
  //delete the note

  return (
    <div>
<h1>Note Dapp</h1>
      
    </div>
  );
}
