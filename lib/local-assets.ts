// Local Asset Mapping for Yiiva Media
// Maps API URLs to bundled local asset URIs
// AUTO-GENERATED - DO NOT EDIT MANUALLY

/**
 * Parse API URL to extract merchant folder and filename
 */
export function parseMediaUrl(apiUrl: string | null): { merchantFolder: string; filename: string } | null {
  if (!apiUrl) return null;

  try {
    const match = apiUrl.match(/\/demo-assets\/([^/]+)\/(.+)/);
    if (!match || !match[1] || !match[2]) {
      console.warn('Could not parse media URL:', apiUrl);
      return null;
    }

    const merchantFolder = match[1];
    const filename = decodeURIComponent(match[2]);
    return { merchantFolder, filename };
  } catch (error) {
    console.error('Error parsing media URL:', error);
    return null;
  }
}

/**
 * Get local asset source from API URL
 * Returns a source object compatible with expo-image and expo-video
 */
export function getLocalAsset(apiUrl: string | null): any {
  const parsed = parseMediaUrl(apiUrl);
  if (!parsed) return null;

  const { merchantFolder, filename } = parsed;

  try {
    if (merchantFolder === 'suhu') {
      return getSuhuAsset(filename);
    }
    if (merchantFolder === 'tol_thema') {
      return getTolthemaAsset(filename);
    }
  } catch (error) {
    console.warn('Asset not found:', merchantFolder + '/' + filename, error);
    return null;
  }

  return null;
}

/**
 * Suhu asset resolver
 */
function getSuhuAsset(filename: string): any {
  const assets: Record<string, any> = {
    'A_VILLAGE_STORY_T-SHIRT_WHITE_1.jpg': require('../assets/media/suhu/A_VILLAGE_STORY_T-SHIRT_WHITE_1.jpg'),
    'A_VILLAGE_STORY_T-SHIRT_WHITE_2.jpg': require('../assets/media/suhu/A_VILLAGE_STORY_T-SHIRT_WHITE_2.jpg'),
    'A_VILLAGE_STORY_T-SHIRT_WHITE_3.png': require('../assets/media/suhu/A_VILLAGE_STORY_T-SHIRT_WHITE_3.png'),
    'Hero_1.mp4': require('../assets/media/suhu/Hero_1.mp4'),
    'Hero_2.mp4': require('../assets/media/suhu/Hero_2.mp4'),
    'Hero_3.mp4': require('../assets/media/suhu/Hero_3.mp4'),
    'SUHU_EYE_KNITTED_GOLFER_1.jpg': require('../assets/media/suhu/SUHU_EYE_KNITTED_GOLFER_1.jpg'),
    'SUHU_EYE_KNITTED_GOLFER_2.jpg': require('../assets/media/suhu/SUHU_EYE_KNITTED_GOLFER_2.jpg'),
    'SUHU_EYE_KNITTED_GOLFER_3.jpg': require('../assets/media/suhu/SUHU_EYE_KNITTED_GOLFER_3.jpg'),
    'SUHU_EYE_KNITTED_GOLFER_4.jpg': require('../assets/media/suhu/SUHU_EYE_KNITTED_GOLFER_4.jpg'),
    'SUHU_EYE_KNITTED_GOLFER_5.jpg': require('../assets/media/suhu/SUHU_EYE_KNITTED_GOLFER_5.jpg'),
    'SUHU_EYE_KNITTED_GOLFER_6.jpg': require('../assets/media/suhu/SUHU_EYE_KNITTED_GOLFER_6.jpg'),
    'SUHU_EYE_KNITTED_GOLFER_7.mp4': require('../assets/media/suhu/SUHU_EYE_KNITTED_GOLFER_7.mp4'),
    'SUHU_EYE_KNITTED_GOLFER_8.jpg': require('../assets/media/suhu/SUHU_EYE_KNITTED_GOLFER_8.jpg'),
    'SUHU_LOGO_FULL_ZIP_SWEATER_BLUE_1.jpg': require('../assets/media/suhu/SUHU_LOGO_FULL_ZIP_SWEATER_BLUE_1.jpg'),
    'SUHU_LOGO_FULL_ZIP_SWEATER_BLUE_2.jpg': require('../assets/media/suhu/SUHU_LOGO_FULL_ZIP_SWEATER_BLUE_2.jpg'),
    'SUHU_LOGO_FULL_ZIP_SWEATER_BLUE_3.jpg': require('../assets/media/suhu/SUHU_LOGO_FULL_ZIP_SWEATER_BLUE_3.jpg'),
    'SUHU_LOGO_FULL_ZIP_SWEATER_BLUE_4.jpg': require('../assets/media/suhu/SUHU_LOGO_FULL_ZIP_SWEATER_BLUE_4.jpg'),
    'SUHU_LOGO_FULL_ZIP_SWEATER_BLUE_5.jpg': require('../assets/media/suhu/SUHU_LOGO_FULL_ZIP_SWEATER_BLUE_5.jpg'),
    'SUHU_LOGO_SWEATPANT_BLACK_2.png': require('../assets/media/suhu/SUHU_LOGO_SWEATPANT_BLACK_2.png'),
    'SUHU_LOGO_SWEATPANT_BLACK_3.jpg': require('../assets/media/suhu/SUHU_LOGO_SWEATPANT_BLACK_3.jpg'),
    'SUHU_LOGO_SWEATPANT_BLACK_4.jpg': require('../assets/media/suhu/SUHU_LOGO_SWEATPANT_BLACK_4.jpg'),
    'SUHU_LOGO_SWEATPANT_BLACK_5.jpg': require('../assets/media/suhu/SUHU_LOGO_SWEATPANT_BLACK_5.jpg'),
    'SUHU_LOGO_SWEATPANT_BLACK_7.jpg': require('../assets/media/suhu/SUHU_LOGO_SWEATPANT_BLACK_7.jpg'),
    'THE_BAG_SUHU_1.jpg': require('../assets/media/suhu/THE_BAG_SUHU_1.jpg'),
    'THE_BAG_SUHU_2.jpg': require('../assets/media/suhu/THE_BAG_SUHU_2.jpg'),
    'THE_BAG_SUHU_3.jpg': require('../assets/media/suhu/THE_BAG_SUHU_3.jpg'),
    'THE_BAG_SUHU_4.jpg': require('../assets/media/suhu/THE_BAG_SUHU_4.jpg'),
    'THE_BAG_SUHU_5.png': require('../assets/media/suhu/THE_BAG_SUHU_5.png'),
    'THE_BAG_SUHU_6.png': require('../assets/media/suhu/THE_BAG_SUHU_6.png'),
    'suhu-logo.png': require('../assets/media/suhu/suhu-logo.png'),
  };

  return assets[filename] || null;
}

/**
 * Tolthema asset resolver
 */
function getTolthemaAsset(filename: string): any {
  const assets: Record<string, any> = {
    'Kimono_Mosadi_Snatched_1.mp4': require('../assets/media/tol_thema/Kimono_Mosadi_Snatched_1.mp4'),
    'Kimono_Mosadi_Snatched_2.png': require('../assets/media/tol_thema/Kimono_Mosadi_Snatched_2.png'),
    'Kimono_Mosadi_Snatched_3.png': require('../assets/media/tol_thema/Kimono_Mosadi_Snatched_3.png'),
    'Kimono_Mosadi_Snatched_4.png': require('../assets/media/tol_thema/Kimono_Mosadi_Snatched_4.png'),
    'Kimono_Mosadi_Snatched_5.mp4': require('../assets/media/tol_thema/Kimono_Mosadi_Snatched_5.mp4'),
    'Lindy_1.mp4': require('../assets/media/tol_thema/Lindy_1.mp4'),
    'Lindy_2.png': require('../assets/media/tol_thema/Lindy_2.png'),
    'Nontsikelelo_boubou_1.png': require('../assets/media/tol_thema/Nontsikelelo_boubou_1.png'),
    'Nontsikelelo_boubou_2.mp4': require('../assets/media/tol_thema/Nontsikelelo_boubou_2.mp4'),
    'Nontsikelelo_boubou_3.mp4': require('../assets/media/tol_thema/Nontsikelelo_boubou_3.mp4'),
    'The_Bonang_dress_1.png': require('../assets/media/tol_thema/The_Bonang_dress_1.png'),
    'The_Bonang_dress_2.png': require('../assets/media/tol_thema/The_Bonang_dress_2.png'),
    'The_Bonang_dress_3.jpg': require('../assets/media/tol_thema/The_Bonang_dress_3.jpg'),
    'The_Khosi_Shirt.png': require('../assets/media/tol_thema/The_Khosi_Shirt.png'),
    'The_Khosi_Shirt_2.png': require('../assets/media/tol_thema/The_Khosi_Shirt_2.png'),
    'The_Lufuno_set_1.png': require('../assets/media/tol_thema/The_Lufuno_set_1.png'),
    'The_Lufuno_set_2.png': require('../assets/media/tol_thema/The_Lufuno_set_2.png'),
    'The_Lufuno_set_3.mp4': require('../assets/media/tol_thema/The_Lufuno_set_3.mp4'),
    'The_Zola_Kimono_1.png': require('../assets/media/tol_thema/The_Zola_Kimono_1.png'),
    'The_Zola_Kimono_2.png': require('../assets/media/tol_thema/The_Zola_Kimono_2.png'),
    'The_Zola_Kimono_3.png': require('../assets/media/tol_thema/The_Zola_Kimono_3.png'),
    'Turtle_neck_lindy_1.mp4': require('../assets/media/tol_thema/Turtle_neck_lindy_1.mp4'),
    'Turtle_neck_lindy_2.png': require('../assets/media/tol_thema/Turtle_neck_lindy_2.png'),
    'Turtle_neck_lindy_3.png': require('../assets/media/tol_thema/Turtle_neck_lindy_3.png'),
    'hero_1.mp4': require('../assets/media/tol_thema/hero_1.mp4'),
    'hero_2.mp4': require('../assets/media/tol_thema/hero_2.mp4'),
    'hero_3.mp4': require('../assets/media/tol_thema/hero_3.mp4'),
    "tol'thema-logo.png": require("../assets/media/tol_thema/tol'thema-logo.png"),
    '✨story_time✨We_actually_designed_and_approved_this_sample_in_February._But_at_that_time,_our_pro.mp4': require('../assets/media/tol_thema/✨story_time✨We_actually_designed_and_approved_this_sample_in_February._But_at_that_time,_our_pro.mp4'),
  };

  return assets[filename] || null;
}

/**
 * Check if we have a local asset for this URL
 */
export function hasLocalAsset(apiUrl: string | null): boolean {
  return getLocalAsset(apiUrl) !== null;
}
