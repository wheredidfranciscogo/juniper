/**
 * Thin wrappers around expo-image-picker so the Add Plant form can request
 * permissions and surface a single uri (or null on cancel/denied).
 */

import * as ImagePicker from 'expo-image-picker';

const options = (): ImagePicker.ImagePickerOptions => ({
  mediaTypes: ['images'] as ImagePicker.MediaType[],
  quality: 0.7,
  exif: false,
});

export async function captureFromCamera(): Promise<string | null> {
  const perm = await ImagePicker.requestCameraPermissionsAsync();
  if (!perm.granted) return null;
  const result = await ImagePicker.launchCameraAsync(options());
  if (result.canceled || !result.assets?.[0]) return null;
  return result.assets[0].uri;
}

export async function pickFromLibrary(): Promise<string | null> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) return null;
  const result = await ImagePicker.launchImageLibraryAsync(options());
  if (result.canceled || !result.assets?.[0]) return null;
  return result.assets[0].uri;
}
