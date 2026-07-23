import {
  HouseIcon, BuildingsIcon, FileTextIcon, FileArrowDownIcon, ReceiptIcon, HandCoinsIcon, ChartBarIcon,
  ClipboardTextIcon, WarningCircleIcon, BellIcon, InfoIcon, WrenchIcon, GearIcon, SignOutIcon, ListIcon,
  BookOpenIcon,
  ShieldCheckIcon, WalletIcon, CalendarCheckIcon, PercentIcon, FireIcon, DropIcon, LightningIcon, BankIcon,
  BriefcaseIcon, PackageIcon, CheckCircleIcon, CircleHalfIcon, WarningIcon, CalendarIcon, XCircleIcon,
  ProhibitIcon, DoorOpenIcon, ArchiveIcon, EraserIcon, MagnifyingGlassIcon, UserIcon, UsersIcon, NoteIcon,
  FileIcon, PaperclipIcon, PrinterIcon, ArrowSquareOutIcon, EnvelopeIcon, BugIcon, SparkleIcon,
  NewspaperIcon, BrainIcon, HourglassIcon, CheckIcon, XIcon, TrashIcon, PencilSimpleIcon, PushPinIcon,
  ArrowsClockwiseIcon, ArrowClockwiseIcon, PlusSquareIcon, CaretUpIcon, CaretDownIcon, CaretRightIcon,
  StorefrontIcon, CreditCardIcon,
} from "@phosphor-icons/react";

export const ICONS = {
  // ניווט
  dashboard: HouseIcon,
  properties: BuildingsIcon,
  leases: FileTextIcon,
  leaseImport: FileArrowDownIcon,
  expenses: ReceiptIcon,
  payments: HandCoinsIcon,
  reports: ChartBarIcon,
  taxReport: ClipboardTextIcon,
  debts: WarningCircleIcon,
  tasks: BellIcon,
  about: InfoIcon,
  maintenance: WrenchIcon,
  settings: GearIcon,
  signOut: SignOutIcon,
  menu: ListIcon,
  guide: BookOpenIcon,

  // קטגוריות (תזכורות + הוצאות)
  insurance: ShieldCheckIcon,
  rentCollection: WalletIcon,
  leaseRenewal: CalendarCheckIcon,
  tax: PercentIcon,
  gas: FireIcon,
  water: DropIcon,
  electricity: LightningIcon,
  municipalTax: BankIcon,
  professionalFees: BriefcaseIcon,
  other: PackageIcon,
  houseCommittee: BuildingsIcon,

  // סטטוס-תשלום ("מיני-רמזור")
  paid: CheckCircleIcon,
  partial: CircleHalfIcon,
  unpaid: WarningIcon,
  future: CalendarIcon,
  overdue: XCircleIcon,
  expired: ProhibitIcon,
  expiringSoon: WarningCircleIcon,
  earlyTermination: DoorOpenIcon,

  // ארכיון/תחזוקה/טפסים
  archive: ArchiveIcon,
  cleanup: EraserIcon,
  integrityCheck: MagnifyingGlassIcon,
  singleTenant: UserIcon,
  multipleTenants: UsersIcon,
  note: NoteIcon,
  document: FileIcon,
  attachment: PaperclipIcon,
  print: PrinterIcon,

  // אודות / AI
  externalLink: ArrowSquareOutIcon,
  mail: EnvelopeIcon,
  bugReport: BugIcon,
  aiMagic: SparkleIcon,
  weeklyDigest: NewspaperIcon,
  aiThinking: BrainIcon,
  aiLoading: HourglassIcon,

  // פעולות כלליות
  check: CheckIcon,
  cancel: XIcon,
  delete: TrashIcon,
  edit: PencilSimpleIcon,
  pin: PushPinIcon,
  sync: ArrowsClockwiseIcon,
  refresh: ArrowClockwiseIcon,
  add: PlusSquareIcon,
  warning: WarningIcon,

  // בטחונות
  security: ShieldCheckIcon,
  promissoryNote: NoteIcon,
  cashDeposit: WalletIcon,

  // כיווץ/הרחבה
  caretUp: CaretUpIcon,
  caretDown: CaretDownIcon,
  caretRight: CaretRightIcon,

  // סוגי-נכס + אמצעי-תשלום
  apartment: BuildingsIcon,
  house: HouseIcon,
  commercial: StorefrontIcon,
  creditCard: CreditCardIcon,
} as const;

export type IconName = keyof typeof ICONS;
