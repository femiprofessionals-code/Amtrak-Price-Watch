import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ProfileForm,
  PasswordForm,
  NotificationPrefsForm,
  ThemeSettings,
  DangerZone,
} from "@/components/settings/forms";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const user = await requireUser();

  return (
    <div className="animate-fade-in mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your profile, security and notification preferences.
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CardTitle>Profile</CardTitle>
            {user.emailVerifiedAt ? (
              <Badge variant="success">Email verified</Badge>
            ) : (
              <Badge variant="warning">Email unverified</Badge>
            )}
          </div>
          <CardDescription>Your personal information.</CardDescription>
        </CardHeader>
        <CardContent>
          <ProfileForm defaults={{ name: user.name, email: user.email }} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Password</CardTitle>
          <CardDescription>Use at least 8 characters.</CardDescription>
        </CardHeader>
        <CardContent>
          <PasswordForm />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Email notifications</CardTitle>
          <CardDescription>Choose which emails you receive.</CardDescription>
        </CardHeader>
        <CardContent>
          <NotificationPrefsForm
            defaults={{
              emailOnPriceDrop: user.emailOnPriceDrop,
              emailOnAlertUpdates: user.emailOnAlertUpdates,
            }}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
          <CardDescription>Choose how the app looks on this device.</CardDescription>
        </CardHeader>
        <CardContent>
          <ThemeSettings />
        </CardContent>
      </Card>

      <Card className="border-danger/30">
        <CardHeader>
          <CardTitle className="text-danger">Danger zone</CardTitle>
          <CardDescription>
            Permanently delete your account, alerts and notification history.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DangerZone email={user.email} />
        </CardContent>
      </Card>
    </div>
  );
}
