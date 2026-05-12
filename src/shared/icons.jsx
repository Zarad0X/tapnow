import React from 'react';
import {
  ArrowRightSquare as ArrowRightSquareNode,
  Bot as BotNode,
  Brush as BrushNode,
  Camera as CameraNode,
  Check as CheckNode,
  CheckCircle2 as CheckCircle2Node,
  CheckSquare as CheckSquareNode,
  ChevronDown as ChevronDownNode,
  ChevronLeft as ChevronLeftNode,
  ChevronRight as ChevronRightNode,
  ClipboardCopy as ClipboardCopyNode,
  Code as CodeNode,
  CopyPlus as CopyPlusNode,
  Download as DownloadNode,
  Edit as EditNode,
  Eraser as EraserNode,
  Eye as EyeNode,
  FileAudio as FileAudioNode,
  FileImage as FileImageNode,
  FileSearch as FileSearchNode,
  FileText as FileTextNode,
  FileVideo as FileVideoNode,
  FolderCog as FolderCogNode,
  FolderOpen as FolderOpenNode,
  Forward as ForwardNode,
  GripVertical as GripVerticalNode,
  HardDrive as HardDriveNode,
  History as HistoryNode,
  Image as ImageNode,
  ImagePlus as ImagePlusNode,
  Layers as LayersNode,
  Layout as LayoutNode,
  LayoutGrid as LayoutGridNode,
  Link as LinkNode,
  Loader2 as Loader2Node,
  Maximize2 as Maximize2Node,
  MessageSquare as MessageSquareNode,
  Mic as MicNode,
  Mic2 as Mic2Node,
  Moon as MoonNode,
  MoreHorizontal as MoreHorizontalNode,
  MousePointer2 as MousePointer2Node,
  Paperclip as PaperclipNode,
  Play as PlayNode,
  Plus as PlusNode,
  RefreshCw as RefreshCwNode,
  Save as SaveNode,
  Scissors as ScissorsNode,
  Send as SendNode,
  Settings as SettingsNode,
  Sparkles as SparklesNode,
  Split as SplitNode,
  Sun as SunNode,
  Trash2 as Trash2Node,
  Undo2 as Undo2Node,
  Unlink as UnlinkNode,
  User as UserNode,
  Users as UsersNode,
  Video as VideoNode,
  Wand2 as Wand2Node,
  X as XNode,
  Zap as ZapNode
} from 'lucide';

const ICONS = {
  ArrowRightSquare: ArrowRightSquareNode,
  Bot: BotNode,
  Brush: BrushNode,
  Camera: CameraNode,
  Check: CheckNode,
  CheckCircle2: CheckCircle2Node,
  CheckSquare: CheckSquareNode,
  ChevronDown: ChevronDownNode,
  ChevronLeft: ChevronLeftNode,
  ChevronRight: ChevronRightNode,
  ClipboardCopy: ClipboardCopyNode,
  Code: CodeNode,
  CopyPlus: CopyPlusNode,
  Download: DownloadNode,
  Edit: EditNode,
  Eraser: EraserNode,
  Eye: EyeNode,
  FileAudio: FileAudioNode,
  FileImage: FileImageNode,
  FileSearch: FileSearchNode,
  FileText: FileTextNode,
  FileVideo: FileVideoNode,
  FolderCog: FolderCogNode,
  FolderOpen: FolderOpenNode,
  Forward: ForwardNode,
  GripVertical: GripVerticalNode,
  HardDrive: HardDriveNode,
  History: HistoryNode,
  Image: ImageNode,
  ImagePlus: ImagePlusNode,
  Layers: LayersNode,
  Layout: LayoutNode,
  LayoutGrid: LayoutGridNode,
  Link: LinkNode,
  Loader2: Loader2Node,
  Maximize2: Maximize2Node,
  MessageSquare: MessageSquareNode,
  Mic: MicNode,
  Mic2: Mic2Node,
  Moon: MoonNode,
  MoreHorizontal: MoreHorizontalNode,
  MousePointer2: MousePointer2Node,
  Paperclip: PaperclipNode,
  Play: PlayNode,
  Plus: PlusNode,
  RefreshCw: RefreshCwNode,
  Save: SaveNode,
  Scissors: ScissorsNode,
  Send: SendNode,
  Settings: SettingsNode,
  Sparkles: SparklesNode,
  Split: SplitNode,
  Sun: SunNode,
  Trash2: Trash2Node,
  Undo2: Undo2Node,
  Unlink: UnlinkNode,
  User: UserNode,
  Users: UsersNode,
  Video: VideoNode,
  Wand2: Wand2Node,
  X: XNode,
  Zap: ZapNode
};

const toReactAttrs = (attrs = {}) => {
  const result = {};
  for (const [key, value] of Object.entries(attrs)) {
    result[key.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())] = value;
  }
  return result;
};

const renderIconNode = ([tag, attrs = {}, children = []], key) =>
  React.createElement(
    tag,
    { key, ...toReactAttrs(attrs) },
    ...(children || []).map((child, index) => renderIconNode(child, index))
  );

export const IconWrapper = React.memo(({ name, size = 24, className = '', ...props }) => {
  const iconData = ICONS[name];
  if (!iconData) return null;

  const [, , children = []] = iconData;
  return React.createElement(
    'svg',
    {
      xmlns: 'http://www.w3.org/2000/svg',
      width: size,
      height: size,
      viewBox: '0 0 24 24',
      fill: 'none',
      stroke: 'currentColor',
      strokeWidth: 2,
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
      className: `lucide lucide-${name} ${className}`,
      ...props
    },
    ...children.map((child, index) => renderIconNode(child, index))
  );
});

export const Plus = (p) => <IconWrapper name="Plus" {...p} />;
export const ImageIcon = (p) => <IconWrapper name="Image" {...p} />;
export const Video = (p) => <IconWrapper name="Video" {...p} />;
export const Settings = (p) => <IconWrapper name="Settings" {...p} />;
export const X = (p) => <IconWrapper name="X" {...p} />;
export const Play = (p) => <IconWrapper name="Play" {...p} />;
export const Layers = (p) => <IconWrapper name="Layers" {...p} />;
export const MousePointer2 = (p) => <IconWrapper name="MousePointer2" {...p} />;
export const Wand2 = (p) => <IconWrapper name="Wand2" {...p} />;
export const Loader2 = (p) => <IconWrapper name="Loader2" {...p} />;
export const LinkIcon = (p) => <IconWrapper name="Link" {...p} />;
export const History = (p) => <IconWrapper name="History" {...p} />;
export const ImagePlus = (p) => <IconWrapper name="ImagePlus" {...p} />;
export const Trash2 = (p) => <IconWrapper name="Trash2" {...p} />;
export const CheckCircle2 = (p) => <IconWrapper name="CheckCircle2" {...p} />;
export const Unlink = (p) => <IconWrapper name="Unlink" {...p} />;
export const CopyPlus = (p) => <IconWrapper name="CopyPlus" {...p} />;
export const ArrowRightSquare = (p) => <IconWrapper name="ArrowRightSquare" {...p} />;
export const MessageSquare = (p) => <IconWrapper name="MessageSquare" {...p} />;
export const Send = (p) => <IconWrapper name="Send" {...p} />;
export const Paperclip = (p) => <IconWrapper name="Paperclip" {...p} />;
export const FileText = (p) => <IconWrapper name="FileText" {...p} />;
export const FileAudio = (p) => <IconWrapper name="FileAudio" {...p} />;
export const FileVideo = (p) => <IconWrapper name="FileVideo" {...p} />;
export const FileImage = (p) => <IconWrapper name="FileImage" {...p} />;
export const ChevronRight = (p) => <IconWrapper name="ChevronRight" {...p} />;
export const ChevronLeft = (p) => <IconWrapper name="ChevronLeft" {...p} />;
export const ChevronDown = (p) => <IconWrapper name="ChevronDown" {...p} />;
export const MoreHorizontal = (p) => <IconWrapper name="MoreHorizontal" {...p} />;
export const Bot = (p) => <IconWrapper name="Bot" {...p} />;
export const User = (p) => <IconWrapper name="User" {...p} />;
export const Users = (p) => <IconWrapper name="Users" {...p} />;
export const GripVertical = (p) => <IconWrapper name="GripVertical" {...p} />;
export const Forward = (p) => <IconWrapper name="Forward" {...p} />;
export const RefreshCw = (p) => <IconWrapper name="RefreshCw" {...p} />;
export const Split = (p) => <IconWrapper name="Split" {...p} />;
export const Maximize2 = (p) => <IconWrapper name="Maximize2" {...p} />;
export const Sun = (p) => <IconWrapper name="Sun" {...p} />;
export const Moon = (p) => <IconWrapper name="Moon" {...p} />;
export const FileSearch = (p) => <IconWrapper name="FileSearch" {...p} />;
export const Sparkles = (p) => <IconWrapper name="Sparkles" {...p} />;
export const Mic = (p) => <IconWrapper name="Mic" {...p} />;
export const Mic2 = (p) => <IconWrapper name="Mic2" {...p} />;
export const Camera = (p) => <IconWrapper name="Camera" {...p} />;
export const Code = (p) => <IconWrapper name="Code" {...p} />;
export const ClipboardCopy = (p) => <IconWrapper name="ClipboardCopy" {...p} />;
export const Edit = (p) => <IconWrapper name="Edit" {...p} />;
export const LayoutGrid = (p) => <IconWrapper name="LayoutGrid" {...p} />;
export const Zap = (p) => <IconWrapper name="Zap" {...p} />;
export const Check = (p) => <IconWrapper name="Check" {...p} />;
export const CheckSquare = (p) => <IconWrapper name="CheckSquare" {...p} />;
export const Eye = (p) => <IconWrapper name="Eye" {...p} />;
export const Scissors = (p) => <IconWrapper name="Scissors" {...p} />;
export const Layout = (p) => <IconWrapper name="Layout" {...p} />;
export const Download = (p) => <IconWrapper name="Download" {...p} />;
export const Save = (p) => <IconWrapper name="Save" {...p} />;
export const FolderOpen = (p) => <IconWrapper name="FolderOpen" {...p} />;
export const FolderCog = (p) => <IconWrapper name="FolderCog" {...p} />;
export const Brush = (p) => <IconWrapper name="Brush" {...p} />;
export const Undo2 = (p) => <IconWrapper name="Undo2" {...p} />;
export const Eraser = (p) => <IconWrapper name="Eraser" {...p} />;
export const HardDrive = (p) => <IconWrapper name="HardDrive" {...p} />;
