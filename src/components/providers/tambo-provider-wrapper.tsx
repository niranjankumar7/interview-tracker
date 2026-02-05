"use client";

import { useMcpServers } from "@/components/tambo/mcp-config-modal";
import { components, tools } from "@/lib/tambo";
import { TamboProvider } from "@tambo-ai/react";
import React, { useEffect } from "react";

export function TamboProviderWrapper({
    children,
}: {
    children: React.ReactNode;
}) {
    const mcpServers = useMcpServers();
    const apiKey = process.env.NEXT_PUBLIC_TAMBO_API_KEY;

    useEffect(() => {
        if (apiKey) return;
        if (process.env.NODE_ENV === 'production') return;
        console.warn(
            'NEXT_PUBLIC_TAMBO_API_KEY is not set. Tambo features are disabled.'
        );
    }, [apiKey]);

    if (!apiKey) {
        return <>{children}</>;
    }

    return (
        <TamboProvider
            apiKey={apiKey}
            components={components}
            tools={tools}
            tamboUrl={process.env.NEXT_PUBLIC_TAMBO_URL}
            mcpServers={mcpServers}
        >
            {children}
        </TamboProvider>
    );
}
