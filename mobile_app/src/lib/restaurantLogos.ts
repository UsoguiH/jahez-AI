export const restaurantLogos: Record<string, any> = {
    'البيك': require('../../assets/logos/albaik.png'),
    'الرومانسية': require('../../assets/logos/alromansiah.png'),
    'الطازج': require('../../assets/logos/altazaj.png'),
    'باسكن روبنز': require('../../assets/logos/baskin_robbins.png'),
    'هرفي': require('../../assets/logos/herfy.png'),
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
