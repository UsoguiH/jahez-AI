export const restaurantLogos: Record<string, any> = {
    'البيك': require('../../assets/logos/albaik.png'),
    'الرومانسية': require('../../assets/logos/alromansiah.png'),
    'الطازج': require('../../assets/logos/altazaj.png'),
    'باسكن روبنز': require('../../assets/logos/baskin_robbins.png'),
    'هرفي': require('../../assets/logos/herfy.png'),
    'ماكدونالدز': require('../../assets/logos/mcdonalds.png'),
    'شاورمر': require('../../assets/logos/shawarmer.png'),
    'كودو': require('../../assets/logos/kudu.png'),
    'بيتزا هت': require('../../assets/logos/pizzahut.png'),
    'ماما نورة': require('../../assets/logos/mamanoura.png'),
    'كنتاكي': require('../../assets/logos/kfc.png'),
    'صب واي': require('../../assets/logos/subway.png'),
    'ستاربكس': require('../../assets/logos/starbucks.png'),
};

export const getRestaurantLogo = (restaurantNameAr: string): any | null => {
    if (!restaurantNameAr) return null;

    // Exact match
    if (restaurantLogos[restaurantNameAr]) {
        return restaurantLogos[restaurantNameAr];
    }

    // Fuzzy matching for partial names
    const names = Object.keys(restaurantLogos);
    for (const name of names) {
        if (restaurantNameAr.includes(name) || name.includes(restaurantNameAr)) {
            return restaurantLogos[name];
        }
    }

    return null; // Return null if not found
};
