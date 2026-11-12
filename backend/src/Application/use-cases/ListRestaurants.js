"use strict";

class ListRestaurants {
    constructor(restaurantRepository) {
        this.restaurantRepository = restaurantRepository;
    }

    execute(query) {
        return this.restaurantRepository.listPublished(query);
    }
}

module.exports = ListRestaurants;
