"use client";

import Column from "./Column";
import UserList from "./UserList";
import ChatBox from "./ChatBox";

export default function ChatLayout({
  rightPanel,
  rightTitle = "Inbox",
}: {
  rightPanel: React.ReactNode;
  rightTitle?: string;
}) {
  return (
    <main className="flex h-full w-full gap-4">
      <Column title="User List">
        <UserList />
      </Column>

      <Column title={rightTitle}>{rightPanel}</Column>

      <Column title="Chat Box">
        <ChatBox />
      </Column>
    </main>
  );
}
