<?php

namespace Database\Factories;

use App\Models\Category;
use App\Models\Service;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Service>
 */
class ServiceFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'category_id' => Category::factory(), 'title' => fake()->words(3, true), 'slug' => fake()->unique()->slug(), 'short_description' => fake()->sentence(), 'description' => fake()->paragraph(), 'icon' => 'code', 'is_published' => true, 'featured' => false, 'sort_order' => 0,
        ];
    }
}
