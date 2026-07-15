import {
  House, Buildings, FileText, FileArrowDown, Receipt, HandCoins, ChartBar,
  ClipboardText, WarningCircle, Bell, Info, Wrench, Gear, SignOut, List,
  ShieldCheck, Wallet, CalendarCheck, Percent, Fire, Drop, Lightning, Bank,
  Briefcase, Package, CheckCircle, CircleHalf, Warning, Calendar, XCircle,
  Prohibit, DoorOpen, Archive, Eraser, MagnifyingGlass, User, Users, Note,
  File, Paperclip, Printer, ArrowSquareOut, Envelope, Bug, Sparkle,
  Newspaper, Brain, Hourglass, Check, X, Trash, PencilSimple, PushPin,
  ArrowsClockwise, ArrowClockwise, PlusSquare, CaretUp, CaretDown, CaretRight,
  Storefront, CreditCard,
} from "@phosphor-icons/react";

export const ICONS = {
  // ניווט
  dashboard: House,
  properties: Buildings,
  leases: FileText,
  leaseImport: FileArrowDown,
  expenses: Receipt,
  payments: HandCoins,
  reports: ChartBar,
  taxReport: ClipboardText,
  debts: WarningCircle,
  tasks: Bell,
  about: Info,
  maintenance: Wrench,
  settings: Gear,
  signOut: SignOut,
  menu: List,

  // קטגוריות (תזכורות + הוצאות)
  insurance: ShieldCheck,
  rentCollection: Wallet,
  leaseRenewal: CalendarCheck,
  tax: Percent,
  gas: Fire,
  water: Drop,
  electricity: Lightning,
  municipalTax: Bank,
  professionalFees: Briefcase,
  other: Package,
  houseCommittee: Buildings,

  // סטטוס-תשלום ("מיני-רמזור")
  paid: CheckCircle,
  partial: CircleHalf,
  unpaid: Warning,
  future: Calendar,
  overdue: XCircle,
  expired: Prohibit,
  expiringSoon: WarningCircle,
  earlyTermination: DoorOpen,

  // ארכיון/תחזוקה/טפסים
  archive: Archive,
  cleanup: Eraser,
  integrityCheck: MagnifyingGlass,
  singleTenant: User,
  multipleTenants: Users,
  note: Note,
  document: File,
  attachment: Paperclip,
  print: Printer,

  // אודות / AI
  externalLink: ArrowSquareOut,
  mail: Envelope,
  bugReport: Bug,
  aiMagic: Sparkle,
  weeklyDigest: Newspaper,
  aiThinking: Brain,
  aiLoading: Hourglass,

  // פעולות כלליות
  check: Check,
  cancel: X,
  delete: Trash,
  edit: PencilSimple,
  pin: PushPin,
  sync: ArrowsClockwise,
  refresh: ArrowClockwise,
  add: PlusSquare,
  warning: Warning,

  // כיווץ/הרחבה
  caretUp: CaretUp,
  caretDown: CaretDown,
  caretRight: CaretRight,

  // סוגי-נכס + אמצעי-תשלום
  apartment: Buildings,
  house: House,
  commercial: Storefront,
  creditCard: CreditCard,
} as const;

export type IconName = keyof typeof ICONS;
