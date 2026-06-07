export const pickemRoutes = {
  public: {
    list: '/pickems',
    detail: (slug: string) => `/pickems/${slug}` as const,
    success: (slug: string) => `/pickems/${slug}/success` as const,
  },
  creator: {
    list: '/creator/pickems',
    new: '/creator/pickems/new',
    dashboard: '/creator/dashboard',
    detail: (id: string) => `/creator/pickems/${id}` as const,
    results: (id: string) => `/creator/pickems/${id}/results` as const,
  },
  api: {
    revalidate: (eventId: string) => `/creator/pickems/${eventId}` as const,
    revalidateResults: (eventId: string) => `/creator/pickems/${eventId}/results` as const,
    revalidatePublic: '/pickems/[slug]' as const,
  },
} as const;
