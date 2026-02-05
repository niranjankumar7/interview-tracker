"use client";

import { useMcpServers } from "@/components/tambo/mcp-config-modal";
import { components, tools } from "@/lib/tambo";
import { TamboProvider } from "@tambo-ai/react";
import React from "react";

export function TamboProviderWrapper({
    children,
}: {
    children: React.ReactNode;
}) {
    const mcpServers = useMcpServers();

    return (
        <TamboProvider
            apiKey={process.env.NEXT_PUBLIC_TAMBO_API_KEY!}
            components={components}
            tools={tools}
            tamboUrl={process.env.NEXT_PUBLIC_TAMBO_URL}
            mcpServers={mcpServers}
        >
            {children}
        </TamboProvider>
    );
}
