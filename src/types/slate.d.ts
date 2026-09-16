import type { BaseEditor } from 'slate';
import type { ReactEditor } from 'slate-react';
import type { HistoryEditor } from 'slate-history';
import type { ScreenplayElementType, ScreenplayText } from './index';

export type CustomEditor = BaseEditor & ReactEditor & HistoryEditor;

export type CustomElement = {
  type: ScreenplayElementType;
  children: CustomText[];
  isModified?: boolean;
  sceneNumber?: string;
};

export type CustomText = ScreenplayText;

declare module 'slate' {
  interface CustomTypes {
    Editor: CustomEditor;
    Element: CustomElement;
    Text: CustomText;
  }
}
