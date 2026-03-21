import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { TRPCClientError } from "@trpc/client";
import { useCallback, useEffect, useMemo } from "react";

type UseAuthOptions = {
  redirectOnUnauthenticated?: boolean;
  redirectPath?: string;
};

export function useAuth(options?: UseAuthOptions) {
  const { redirectOnUnauthenticated = false, redirectPath = getLoginUrl() } =
    options ?? {};
  const utils = trpc.useUtils();

  // BYPASS AUTH: Return mock user for development
  const mockUser = {
    id: 1,
    email: "ian@neurovitalityltd.com",
    name: "Ian",
    role: "owner",
  };

  const meQuery = trpc.customAuth.me.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  });

  const logoutMutation = trpc.customAuth.logout.useMutation({
    onSuccess: () => {
      utils.customAuth.me.setData(undefined, null);
    },
  });

  const logout = useCallback(async () => {
    try {
      await logoutMutation.mutateAsync();
    } catch (error: unknown) {
      if (
        error instanceof TRPCClientError &&
        error.data?.code === "UNAUTHORIZED"
      ) {
        // Already logged out, proceed with cleanup
      } else {
        console.error('Logout error:', error);
      }
    } finally {
      // Clear auth state
      utils.customAuth.me.setData(undefined, null);
      await utils.customAuth.me.invalidate();
      // Clear local storage
      localStorage.removeItem('manus-runtime-user-info');
      localStorage.removeItem('onboarding_completed');
      // Redirect to login
      window.location.href = getLoginUrl();
    }
  }, [logoutMutation, utils]);

  const state = useMemo(() => {
    // BYPASS AUTH: Always return mock user
    localStorage.setItem(
      "manus-runtime-user-info",
      JSON.stringify(mockUser)
    );
    return {
      user: mockUser,
      loading: false,
      error: null,
      isAuthenticated: true,
    };
  }, []);

  // BYPASS AUTH: Disable redirect
  // useEffect(() => {
  //   if (!redirectOnUnauthenticated) return;
  //   if (meQuery.isLoading || logoutMutation.isPending) return;
  //   if (state.user) return;
  //   if (typeof window === "undefined") return;
  //   if (window.location.pathname === redirectPath) return;
  //
  //   window.location.href = redirectPath
  // }, [
  //   redirectOnUnauthenticated,
  //   redirectPath,
  //   logoutMutation.isPending,
  //   meQuery.isLoading,
  //   state.user,
  // ]);

  return {
    ...state,
    refresh: () => meQuery.refetch(),
    logout,
  };
}
