import { StyleSheet } from 'react-native';
import { Colors } from '../constants/Colors';

export const formStyles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  labelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    color: Colors.text,
    fontSize: 16,
    fontFamily: 'SpaceGrotesk-Regular',
  },
  labelIcon: {
    marginLeft: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    gap: 12,
  },
  input: {
    flex: 1,
    color: Colors.text,
    fontSize: 16,
    fontFamily: 'SpaceGrotesk-Regular',
    paddingVertical: 16,
  },
  errorBorder: {
    borderColor: Colors.error,
    borderWidth: 1,
  },
  errorText: {
    color: Colors.error,
    fontSize: 12,
    marginTop: 4,
    fontFamily: 'SpaceGrotesk-Regular',
  },
  errorContainer: {
    marginTop: 8,
    padding: 12,
    backgroundColor: `${Colors.error}15`,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: Colors.error,
  },
  helperText: {
    color: Colors.textSecondary,
    fontSize: 12,
    marginTop: 4,
    fontFamily: 'SpaceGrotesk-Regular',
  },
  // Additional common form styles
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  column: {
    flex: 1,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 8,
  },
  checkboxLabel: {
    color: Colors.text,
    fontSize: 14,
    fontFamily: 'SpaceGrotesk-Regular',
    marginLeft: 8,
    flex: 1,
  },
  button: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: Colors.text,
    fontSize: 16,
    fontFamily: 'SpaceGrotesk-Medium',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});

export default formStyles; 