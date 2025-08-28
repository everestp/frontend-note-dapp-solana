'use client';

import React, { ReactNode, useMemo } from 'react';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { clusterApiUrl } from '@solana/web3.js';
import {
    ConnectionProvider,
    WalletProvider
} from '@solana/wallet-adapter-react';
import {
    WalletModalProvider,
    WalletMultiButton
} from '@solana/wallet-adapter-react-ui';
import '@solana/wallet-adapter-react-ui/styles.css'
type Props = {
    children: ReactNode;
};

const WalletContextProvider: React.FC<Props> = ({ children }) => {
    const network = WalletAdapterNetwork.Devnet;
    const endpoint = useMemo(() => clusterApiUrl(network), [network]);

    // No manual wallet adapters needed; Wallet Standard handles discovery.
    const wallets = useMemo(() => [], []);

    return (
        <ConnectionProvider endpoint={endpoint}>
            <WalletProvider wallets={wallets} autoConnect>
                <WalletModalProvider>
                    <div className="min-h-screen bg-gray-100">
                        <header className="bg-white shadow-sm px-5 py-4 border-b border-gray-200">
                            <div className="flex justify-between items-center">
                                <h1 className="text-2xl font-bold text-gray-800">
                                    Note Dapp
                                </h1>
                                <WalletMultiButton />
                            </div>
                        </header>
                        <main className="p-5">{children}</main>
                    </div>
                </WalletModalProvider>
            </WalletProvider>
        </ConnectionProvider>
    );
};

export default WalletContextProvider;
