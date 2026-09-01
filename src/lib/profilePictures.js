import apple from '../assets/images/profile_pictures/apple.PNG'
import banana from '../assets/images/profile_pictures/banana.PNG'
import cherry from '../assets/images/profile_pictures/cherry.PNG'
import orange from '../assets/images/profile_pictures/orange.PNG'

// key must match the values PRESET_PICTURES accepts in api/controllers/profileController.js
export const PROFILE_PICTURES = [
  { key: 'apple', src: apple, label: 'Apple' },
  { key: 'banana', src: banana, label: 'Banana' },
  { key: 'cherry', src: cherry, label: 'Cherry' },
  { key: 'orange', src: orange, label: 'Orange' },
]

export function profilePictureSrc(key) {
  return PROFILE_PICTURES.find((p) => p.key === key)?.src
}
