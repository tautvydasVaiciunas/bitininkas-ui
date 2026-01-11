export type RouteBuilder = (id: string) => string;

export const appRoutes = {
  news: '/naujienos',
  newsDetail: (id: string) => `/naujienos/${id}`,
  hives: '/avilai',
  hiveDetail: (id: string) => `/avilai/${id}`,
  tasks: '/uzduotys',
  taskDetail: (id: string) => `/uzduotys/${id}`,
  taskPreview: (id: string) => `/uzduotys/${id}/preview`,
  taskRun: (id: string) => `/uzduotys/${id}/run`,
  support: '/zinutes',
  profile: '/profilis',
  faq: '/duk',
};
