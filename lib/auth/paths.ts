export function isProtectedPath(pathname: string) {
  return (
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/account") ||
    pathname.startsWith("/onboarding") ||
    pathname.startsWith("/kyc-review")
  );
}
