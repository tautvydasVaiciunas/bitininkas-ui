import { User, Group, Hive, Task, Assignment, Notification, Step, Template } from './types';

export const mockUsers: User[] = [
  {
    id: '1',
    name: 'Administratorius',
    email: 'admin@example.com',
    role: 'admin',
    phone: '+37061111111',
    address: 'Vilniaus g. 10, Vilnius',
    groupId: '1',
    createdAt: '2024-01-01T00:00:00Z',
  },
  {
    id: '2',
    name: 'Jonas Petraitis',
    email: 'jonas@example.com',
    role: 'user',
    phone: '+37061234567',
    address: 'Vilniaus g. 1, Vilnius',
    groupId: '1',
    createdAt: '2024-01-15T00:00:00Z',
  },
  {
    id: '3',
    name: 'Petras Jonaitis',
    email: 'petras@example.com',
    role: 'user',
    phone: '+37061234568',
    address: 'Kauno g. 2, Kaunas',
    groupId: '2',
    createdAt: '2024-01-20T00:00:00Z',
  },
  {
    id: '4',
    name: 'Manageris Vardenis',
    email: 'manager@example.com',
    role: 'manager',
    phone: '+37061234569',
    address: 'Gedimino pr. 15, Vilnius',
    groupId: '1',
    createdAt: '2024-01-10T00:00:00Z',
  },
];

export const mockGroups: Group[] = [
  {
    id: '1',
    name: 'Vilniaus bitininkai',
    description: 'Bitininkų bendruomenė Vilniaus regione',
    memberCount: 3,
  },
  {
    id: '2',
    name: 'Kauno bitininkai',
    description: 'Bitininkų bendruomenė Kauno regione',
    memberCount: 1,
  },
];

export const mockHives: Hive[] = [
  {
    id: '1',
    name: 'Avilys 1',
    location: 'Vilnius, Žvėrynas',
    queenYear: 2023,
    acquisitionDate: '2023-04-15',
    status: 'active',
    ownerId: '2',
    pendingTasksCount: 2,
  },
  {
    id: '2',
    name: 'Avilys 2',
    location: 'Vilnius, Antakalnis',
    queenYear: 2022,
    acquisitionDate: '2022-06-20',
    status: 'active',
    ownerId: '2',
    pendingTasksCount: 1,
  },
  {
    id: '3',
    name: 'Avilys 3',
    location: 'Kaunas, Centras',
    queenYear: 2024,
    acquisitionDate: '2024-05-10',
    status: 'active',
    ownerId: '3',
    pendingTasksCount: 0,
  },
];

export const mockSteps: Step[] = [
  {
    id: 's1',
    title: 'Paruošti įrankius',
    description: 'Paruošti visus reikalingus įrankius darbui',
    contentText: 'Patikrinkite ar turite: dūmų generatorių, avilių įrankį, apsauginį kostiumą, pirštines.',
    requiresProof: false,
    mediaType: 'none',
    order: 1,
  },
  {
    id: 's2',
    title: 'Atidaryti avilį',
    description: 'Atsargiai atidaryti avilinės dangtį',
    contentText: 'Naudojant dūmus, nuraminkite bites. Švelniai pašalinkite dangtį.',
    requiresProof: true,
    mediaType: 'image',
    order: 2,
  },
  {
    id: 's3',
    title: 'Patikrinti rėmelius',
    description: 'Patikrinti kiekvieno rėmelio būklę',
    contentText: 'Ieškokite karalienės, patikrinkite kiaušinėlius, lervutes, medų.',
    requiresProof: true,
    mediaType: 'image',
    order: 3,
  },
  {
    id: 's4',
    title: 'Užfiksuoti rezultatus',
    description: 'Užpildyti stebėjimų žurnalą',
    contentText: 'Įrašykite visus pastebėjimus, būklę, veiksmus.',
    requiresProof: false,
    mediaType: 'none',
    order: 4,
  },
];

export const mockTasks: Task[] = [
  {
    id: 't1',
    name: 'Pavasarinis avilio patikrinimas',
    description: 'Pilnas avilio patikrinimas po žiemos',
    category: 'Patikrinimas',
    seasonality: ['Kovas', 'Balandis'],
    frequency: 'once',
    defaultDueDays: 7,
    steps: mockSteps.slice(0, 4),
    createdAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 't2',
    name: 'Varroa erkių kontrolė',
    description: 'Erkių patikrinimas ir gydymas',
    category: 'Sveikata',
    seasonality: ['Rugpjūtis', 'Rugsėjis'],
    frequency: 'monthly',
    defaultDueDays: 14,
    steps: [
      {
        id: 's5',
        title: 'Patikrinti erkių lygį',
        description: 'Atlikti erkių skaičiavimą',
        contentText: 'Naudokite lipnų padėklą 24 valandoms.',
        requiresProof: true,
        mediaType: 'image',
        order: 1,
      },
      {
        id: 's6',
        title: 'Pritaikyti gydymą',
        description: 'Jei reikia, pradėti gydymą',
        contentText: 'Naudokite patvirtintus vaistus pagal instrukciją.',
        requiresProof: false,
        mediaType: 'none',
        order: 2,
      },
    ],
    createdAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 't3',
    name: 'Medaus kopinėjimas',
    description: 'Medaus rinkimas iš avilių',
    category: 'Derlius',
    seasonality: ['Birželis', 'Liepa', 'Rugpjūtis'],
    frequency: 'once',
    defaultDueDays: 3,
    steps: [
      {
        id: 's7',
        title: 'Paruošti įrangą',
        description: 'Paruošti medaus ištraukimo įrangą',
        contentText: 'Išvalyti centrifugą, paruošti kibirus, peilius.',
        requiresProof: false,
        mediaType: 'none',
        order: 1,
      },
      {
        id: 's8',
        title: 'Išimti rėmelius',
        description: 'Išimti užpečėtėtus medaus rėmelius',
        contentText: 'Pasirinkti tik visiškai užpečėtėtus rėmelius.',
        requiresProof: true,
        mediaType: 'image',
        order: 2,
      },
      {
        id: 's9',
        title: 'Ištraukti medų',
        description: 'Centrifuguoti medų',
        contentText: 'Nupjauti korių dangtelį, sukti centrifugoje.',
        requiresProof: false,
        mediaType: 'none',
        order: 3,
      },
    ],
    createdAt: '2024-01-01T00:00:00Z',
  },
];

const today = new Date();
const addDays = (date: Date, days: number) => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result.toISOString();
};

export const mockAssignments: Assignment[] = [
  {
    id: 'a1',
    taskId: 't1',
    task: mockTasks[0],
    hiveId: '1',
    hive: mockHives[0],
    assignedTo: '2',
    dueDate: addDays(today, -2), // overdue
    status: 'overdue',
    progress: 0,
    createdAt: addDays(today, -9),
  },
  {
    id: 'a2',
    taskId: 't2',
    task: mockTasks[1],
    hiveId: '1',
    hive: mockHives[0],
    assignedTo: '2',
    dueDate: addDays(today, 5),
    status: 'in_progress',
    progress: 50,
    createdAt: addDays(today, -9),
  },
  {
    id: 'a3',
    taskId: 't3',
    task: mockTasks[2],
    hiveId: '2',
    hive: mockHives[1],
    assignedTo: '2',
    dueDate: addDays(today, 10),
    status: 'pending',
    progress: 0,
    createdAt: addDays(today, -3),
  },
  {
    id: 'a4',
    taskId: 't1',
    task: mockTasks[0],
    hiveId: '3',
    hive: mockHives[2],
    assignedTo: '3',
    dueDate: addDays(today, 3),
    status: 'in_progress',
    progress: 75,
    createdAt: addDays(today, -4),
  },
];

export const mockNotifications: Notification[] = [
  {
    id: 'n1',
    userId: '2',
    type: 'new_task',
    title: 'Nauja užduotis',
    message: 'Jums priskirta nauja užduotis "Pavasarinis avilio patikrinimas"',
    read: false,
    createdAt: addDays(today, -2),
  },
  {
    id: 'n2',
    userId: '2',
    type: 'deadline_approaching',
    title: 'Užduoties terminas artėja',
    message: 'Užduotis "Varroa erkių kontrolė" turi būti atlikta per 5 dienas',
    read: false,
    createdAt: addDays(today, -1),
  },
  {
    id: 'n3',
    userId: '2',
    type: 'task_completed',
    title: 'Užduotis atlikta',
    message: 'Sveikiname! Užduotis "Medaus kopinėjimas" sėkmingai užbaigta',
    read: true,
    createdAt: addDays(today, -5),
  },
];

export const mockTemplates: Template[] = [
  {
    id: 'tp1',
    name: 'Pavasarinis sezonas',
    description: 'Standartinės užduotys pavasario sezonui',
    taskIds: ['t1', 't2'],
    createdAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 'tp2',
    name: 'Vasaros derliaus programa',
    description: 'Medaus rinkimo ir kontrolės užduotys',
    taskIds: ['t2', 't3'],
    createdAt: '2024-01-01T00:00:00Z',
  },
];
