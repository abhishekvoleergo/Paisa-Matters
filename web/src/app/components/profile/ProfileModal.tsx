"use client";

import { FormEvent, useEffect, useState } from "react";
import { UserProfile, updateProfile, changePassword } from "@/lib/api";

type ProfileModalProps = {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile;
  onUserUpdated: (user: UserProfile) => void;
};

type ActiveTab = "profile" | "security";

export default function ProfileModal({
  isOpen,
  onClose,
  user,
  onUserUpdated,
}: ProfileModalProps) {
  const [activeTab, setActiveTab] = useState<ActiveTab>("profile");

  // Profile Form state
  const [fullName, setFullName] = useState(user.fullName);
  const [upiId, setUpiId] = useState(user.upiId || "");
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [profileSuccess, setProfileSuccess] = useState("");

  // Password Form state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");

  // Sync state whenever modal opens or user prop changes
  useEffect(() => {
    if (isOpen) {
      setFullName(user.fullName);
      setUpiId(user.upiId || "");
      setProfileError("");
      setProfileSuccess("");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordError("");
      setPasswordSuccess("");
    }
  }, [isOpen, user]);

  // Handle ESC key to close
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !profileSaving && !passwordSaving) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, profileSaving, passwordSaving, onClose]);

  if (!isOpen) return null;

  async function handleProfileSubmit(e: FormEvent) {
    e.preventDefault();
    setProfileError("");
    setProfileSuccess("");

    const trimmedName = fullName.trim();
    if (!trimmedName) {
      setProfileError("Full name is required.");
      return;
    }
    if (trimmedName.length > 150) {
      setProfileError("Full name must be 150 characters or fewer.");
      return;
    }

    const trimmedUpi = upiId.trim();
    if (trimmedUpi) {
      if (trimmedUpi.length > 100) {
        setProfileError("UPI ID must be 100 characters or fewer.");
        return;
      }
      if (!/^[a-zA-Z0-9.\-_]{2,}@[a-zA-Z0-9.\-]+$/.test(trimmedUpi)) {
        setProfileError("Enter a valid UPI ID (e.g. yourname@upi).");
        return;
      }
    }

    setProfileSaving(true);
    try {
      const updated = await updateProfile({
        fullName: trimmedName,
        upiId: trimmedUpi || null,
      });
      onUserUpdated(updated);
      setProfileSuccess("Profile updated successfully.");
    } catch (err) {
      setProfileError(
        err instanceof Error ? err.message : "Failed to update profile. Please try again."
      );
    } finally {
      setProfileSaving(false);
    }
  }

  async function handlePasswordSubmit(e: FormEvent) {
    e.preventDefault();
    setPasswordError("");
    setPasswordSuccess("");

    if (!currentPassword) {
      setPasswordError("Please enter your current password.");
      return;
    }
    if (
      newPassword.length < 10 ||
      newPassword.length > 128 ||
      !/[A-Za-z]/.test(newPassword) ||
      !/\d/.test(newPassword)
    ) {
      setPasswordError(
        "New password must be 10–128 characters with at least one letter and one number."
      );
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("The new passwords do not match.");
      return;
    }

    setPasswordSaving(true);
    try {
      await changePassword({
        currentPassword,
        newPassword,
        confirmPassword,
      });
      setPasswordSuccess("Password changed successfully.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setPasswordError(
        err instanceof Error ? err.message : "Failed to change password. Please check your current password."
      );
    } finally {
      setPasswordSaving(false);
    }
  }

  const inputClass =
    "w-full rounded-xl border border-white/10 bg-[#0c1514] px-4 py-3 text-sm text-[#f0eee6] outline-none transition placeholder:text-white/30 focus:border-[#91cbb7]/70 focus:ring-2 focus:ring-[#91cbb7]/15";
  const labelClass = "mb-2 block text-xs font-medium tracking-wide text-white/70";

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-black/75 p-4 backdrop-blur-sm"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !profileSaving && !passwordSaving) {
          onClose();
        }
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="profile-settings-title"
        className="my-auto w-full max-w-lg rounded-[26px] border border-white/10 bg-[#15211f] p-6 shadow-2xl sm:p-8"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-mono text-[10px] tracking-[0.25em] text-[#91cbb7]">
              ACCOUNT MANAGEMENT
            </p>
            <h2 id="profile-settings-title" className="mt-1 font-serif text-3xl text-[#f0eee6]">
              Profile Settings
            </h2>
          </div>
          <button
            type="button"
            aria-label="Close profile settings"
            disabled={profileSaving || passwordSaving}
            onClick={onClose}
            className="rounded-full border border-white/10 p-2 text-xs text-white/50 transition hover:bg-white/10 hover:text-white disabled:opacity-40"
          >
            ✕
          </button>
        </div>

        {/* User preview header pill */}
        <div className="mt-5 flex items-center gap-3.5 rounded-2xl border border-white/[0.07] bg-white/[0.025] p-3.5">
          <span className="grid size-11 place-items-center rounded-full bg-[#91cbb7]/15 font-serif text-base font-semibold text-[#b8dfd0]">
            {user.fullName.trim().charAt(0).toUpperCase()}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-white">{user.fullName}</p>
            <p className="truncate text-xs text-white/45">{user.email}</p>
          </div>
          <span className="inline-flex rounded-full border border-[#91cbb7]/20 bg-[#91cbb7]/[0.08] px-2.5 py-1 text-[10px] text-[#b8dfd0]">
            {user.roles.join(", ") || "User"}
          </span>
        </div>

        {/* Tab switch */}
        <div className="mt-6 flex border-b border-white/[0.08]" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "profile"}
            onClick={() => setActiveTab("profile")}
            className={`flex-1 pb-3 text-xs font-medium transition ${
              activeTab === "profile"
                ? "border-b-2 border-[#91cbb7] font-semibold text-[#91cbb7]"
                : "text-white/45 hover:text-white"
            }`}
          >
            Personal Details &amp; UPI
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "security"}
            onClick={() => setActiveTab("security")}
            className={`flex-1 pb-3 text-xs font-medium transition ${
              activeTab === "security"
                ? "border-b-2 border-[#91cbb7] font-semibold text-[#91cbb7]"
                : "text-white/45 hover:text-white"
            }`}
          >
            Security &amp; Password
          </button>
        </div>

        {/* Tab 1: Profile & UPI */}
        {activeTab === "profile" && (
          <form onSubmit={handleProfileSubmit} className="mt-6 space-y-4" noValidate>
            {profileError && (
              <p
                role="alert"
                className="rounded-xl border border-[#df947f]/30 bg-[#df947f]/[0.08] px-3.5 py-2.5 text-xs text-[#f0b4a3]"
              >
                {profileError}
              </p>
            )}
            {profileSuccess && (
              <p
                role="status"
                className="rounded-xl border border-emerald-400/20 bg-emerald-400/[0.06] px-3.5 py-2.5 text-xs text-emerald-200"
              >
                ✓ {profileSuccess}
              </p>
            )}

            {/* Full Name */}
            <div>
              <label htmlFor="edit-profile-name" className={labelClass}>
                Full name <span className="text-[#91cbb7]">*</span>
              </label>
              <input
                id="edit-profile-name"
                type="text"
                required
                maxLength={150}
                disabled={profileSaving}
                className={inputClass}
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Your full name"
              />
            </div>

            {/* Email (Read-only) */}
            <div>
              <div className="flex items-center justify-between">
                <label htmlFor="edit-profile-email" className={labelClass}>
                  Email address
                </label>
                <span className="text-[10px] text-white/35">Read-only</span>
              </div>
              <input
                id="edit-profile-email"
                type="email"
                readOnly
                disabled
                className={`${inputClass} cursor-not-allowed bg-black/20 text-white/45 border-white/[0.05]`}
                value={user.email}
              />
              <p className="mt-1 text-[10px] text-white/35">
                Your email is linked to your login credentials and cannot be changed here.
              </p>
            </div>

            {/* UPI ID */}
            <div>
              <div className="flex items-center justify-between">
                <label htmlFor="edit-profile-upi" className={labelClass}>
                  UPI ID (optional)
                </label>
                {upiId.trim() && (
                  <button
                    type="button"
                    onClick={() => setUpiId("")}
                    className="text-[10px] text-[#df947f] hover:underline"
                  >
                    Clear UPI ID
                  </button>
                )}
              </div>
              <input
                id="edit-profile-upi"
                type="text"
                maxLength={100}
                disabled={profileSaving}
                className={inputClass}
                value={upiId}
                onChange={(e) => setUpiId(e.target.value)}
                placeholder="yourname@upi (e.g. name@okhdfcbank)"
              />
              <p className="mt-1 text-[10px] text-white/35">
                Used to generate your payment QR and UPI settlement links so group members can pay you back easily.
              </p>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={profileSaving}
                onClick={onClose}
                className="rounded-full border border-white/15 px-5 py-2.5 text-xs text-white/70 transition hover:bg-white/5 hover:text-white disabled:opacity-40"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={profileSaving}
                className="rounded-full bg-[#91cbb7] px-6 py-2.5 text-xs font-semibold text-[#10201b] transition hover:bg-[#b8dfd0] disabled:cursor-wait disabled:opacity-60"
              >
                {profileSaving ? "Saving changes…" : "Save profile"}
              </button>
            </div>
          </form>
        )}

        {/* Tab 2: Security & Password */}
        {activeTab === "security" && (
          <form onSubmit={handlePasswordSubmit} className="mt-6 space-y-4" noValidate>
            {passwordError && (
              <p
                role="alert"
                className="rounded-xl border border-[#df947f]/30 bg-[#df947f]/[0.08] px-3.5 py-2.5 text-xs text-[#f0b4a3]"
              >
                {passwordError}
              </p>
            )}
            {passwordSuccess && (
              <p
                role="status"
                className="rounded-xl border border-emerald-400/20 bg-emerald-400/[0.06] px-3.5 py-2.5 text-xs text-emerald-200"
              >
                ✓ {passwordSuccess}
              </p>
            )}

            {/* Current Password */}
            <div>
              <label htmlFor="profile-current-password" className={labelClass}>
                Current password <span className="text-[#91cbb7]">*</span>
              </label>
              <div className="relative">
                <input
                  id="profile-current-password"
                  type={showCurrentPassword ? "text" : "password"}
                  required
                  disabled={passwordSaving}
                  className={`${inputClass} pr-16`}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute inset-y-0 right-3 text-xs text-white/45 hover:text-white"
                  aria-label={showCurrentPassword ? "Hide password" : "Show password"}
                >
                  {showCurrentPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            {/* New Password */}
            <div>
              <label htmlFor="profile-new-password" className={labelClass}>
                New password <span className="text-[#91cbb7]">*</span>
              </label>
              <div className="relative">
                <input
                  id="profile-new-password"
                  type={showNewPassword ? "text" : "password"}
                  required
                  disabled={passwordSaving}
                  className={`${inputClass} pr-16`}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="10+ characters with letters & numbers"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute inset-y-0 right-3 text-xs text-white/45 hover:text-white"
                  aria-label={showNewPassword ? "Hide password" : "Show password"}
                >
                  {showNewPassword ? "Hide" : "Show"}
                </button>
              </div>
              <p className="mt-1 text-[10px] text-white/35">
                At least 10 characters, including at least one letter and one number.
              </p>
            </div>

            {/* Confirm New Password */}
            <div>
              <label htmlFor="profile-confirm-password" className={labelClass}>
                Confirm new password <span className="text-[#91cbb7]">*</span>
              </label>
              <div className="relative">
                <input
                  id="profile-confirm-password"
                  type={showConfirmPassword ? "text" : "password"}
                  required
                  disabled={passwordSaving}
                  className={`${inputClass} pr-16`}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat new password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-3 text-xs text-white/45 hover:text-white"
                  aria-label={showConfirmPassword ? "Hide confirmation" : "Show confirmation"}
                >
                  {showConfirmPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={passwordSaving}
                onClick={onClose}
                className="rounded-full border border-white/15 px-5 py-2.5 text-xs text-white/70 transition hover:bg-white/5 hover:text-white disabled:opacity-40"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={passwordSaving}
                className="rounded-full bg-[#91cbb7] px-6 py-2.5 text-xs font-semibold text-[#10201b] transition hover:bg-[#b8dfd0] disabled:cursor-wait disabled:opacity-60"
              >
                {passwordSaving ? "Updating password…" : "Change password"}
              </button>
            </div>
          </form>
        )}
      </section>
    </div>
  );
}

