import React, { useState } from "react";
import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { Navbar } from "./Navbar";
import { ProfileModal } from "./ProfileModal";

export const Layout = () => {
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  return (
    <div className="app-container">
      <Sidebar onOpenProfile={() => setIsProfileOpen(true)} />
      <div className="app-main">
        <Navbar onOpenProfile={() => setIsProfileOpen(true)} />
        <main className="app-content">
          <Outlet />
        </main>
      </div>

      <ProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
      />
    </div>
  );
};
