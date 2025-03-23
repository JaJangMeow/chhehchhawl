// This is a type declaration file, not meant to be imported directly by Expo Router
declare module 'react-native-keyboard-aware-scroll-view' {
  import { ComponentClass, ComponentType, RefObject } from 'react';
  import { ScrollViewProps, KeyboardAvoidingViewProps, FlatListProps, SectionListProps } from 'react-native';

  interface KeyboardAwareProps {
    /**
     * Adds an extra offset that represents the TabBarIOS height.
     */
    viewIsInsideTabBar?: boolean;

    /**
     * Coordinates that will be used to reset the scroll when the keyboard hides.
     */
    resetScrollToCoords?: { x: number; y: number } | null;

    /**
     * When focus in TextInput will scroll the position
     */
    enableAutomaticScroll?: boolean;

    /**
     * Enables keyboard aware scroll on Android.
     */
    enableOnAndroid?: boolean;

    /**
     * Adds an extra offset when focusing the TextInputs.
     */
    extraHeight?: number;

    /**
     * Adds an extra offset to the keyboard.
     */
    extraScrollHeight?: number;

    /**
     * Sets scroll behavior for the component.
     */
    contentContainerStyle?: any;

    /**
     * Check if component is wrapped within KeyboardAvoidingView.
     */
    enableResetScrollToCoords?: boolean;

    /**
     * Callback when focused TextInput changes position.
     */
    onKeyboardDidShow?: Function;

    /**
     * Callback when keyboard will hide.
     */
    onKeyboardWillHide?: Function;

    /**
     * Callback when keyboard will show.
     */
    onKeyboardWillShow?: Function;

    /**
     * Callback when keyboard did show.
     */
    onKeyboardDidHide?: Function;

    /**
     * Alternative to extraHeight.
     */
    keyboardOpeningTime?: number;

    /**
     * Extra scroll to the top distance.
     */
    scrollToOverflowEnabled?: boolean;
  }

  interface KeyboardAwareScrollViewProps extends KeyboardAwareProps, ScrollViewProps {}
  interface KeyboardAwareFlatListProps<ItemT> extends KeyboardAwareProps, FlatListProps<ItemT> {}
  interface KeyboardAwareSectionListProps<ItemT, SectionT> extends KeyboardAwareProps, SectionListProps<ItemT, SectionT> {}

  class KeyboardAwareScrollView extends React.Component<KeyboardAwareScrollViewProps> {
    scrollToPosition: (x: number, y: number, animated?: boolean) => void;
    scrollToEnd: (animated?: boolean) => void;
    scrollToFocusedInput: (reactNode: any, extraHeight?: number, keyboardOpeningTime?: number) => void;
    scrollIntoView: (element: any, options?: { viewOffset?: number }) => void;
  }

  class KeyboardAwareFlatList<ItemT = any> extends React.Component<KeyboardAwareFlatListProps<ItemT>> {}
  class KeyboardAwareSectionList<ItemT = any, SectionT = any> extends React.Component<KeyboardAwareSectionListProps<ItemT, SectionT>> {}
  
  export { KeyboardAwareScrollView, KeyboardAwareFlatList, KeyboardAwareSectionList };
  export default KeyboardAwareScrollView;
}

// For Expo Router compatibility
const KeyboardComponent = {
  name: "KeyboardAwareScrollViewTypes",
  description: "Type definitions for react-native-keyboard-aware-scroll-view"
};

export default KeyboardComponent; 