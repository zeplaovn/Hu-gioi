# Effect dispatch

Tất cả operator trong item_effects.json được liệt kê ở effect_handler_registry.json. Dispatcher kiểm hỗ trợ toàn bộ effects của item trước khi tiêu đồ; không áp một nửa rồi báo lỗi. Combat demo thực thi nhóm phục hồi/khiên/damage/cleanse/buff chiến đấu và50 phase. Các op ngoài trận được chuyển về handler của nghề/tu luyện/tài khoản tương ứng theo hợp đồng này.

- `account_echo` → `account.apply_account_echo`.
- `avatar_level_add` → `hazard.apply_avatar_level_add`.
- `base_stat_random` → `cultivation.apply_base_stat_random`.
- `breakthrough_bonus` → `cultivation.apply_breakthrough_bonus`.
- `cleanse` → `combat.apply_cleanse`.
- `craft_quality_input` → `profession.apply_craft_quality_input`.
- `craft_quality_shift` → `profession.apply_craft_quality_shift`.
- `cultivation_progress` → `cultivation.apply_cultivation_progress`.
- `cultivation_speed` → `equipment.apply_cultivation_speed`.
- `damage` → `combat.apply_damage`.
- `damage_over_time` → `combat.apply_damage_over_time`.
- `damage_taken_reduce` → `combat.apply_damage_taken_reduce`.
- `debuff_stat` → `combat.apply_debuff_stat`.
- `ending_reflection_timer` → `ending.apply_ending_reflection_timer`.
- `failure_loss_reduce` → `cultivation.apply_failure_loss_reduce`.
- `fertilize_input` → `item_resource.apply_fertilize_input`.
- `hazard_block` → `hazard.apply_hazard_block`.
- `hazard_severity_reduce` → `hazard.apply_hazard_severity_reduce`.
- `heal_hp` → `combat.apply_heal_hp`.
- `hp_cost_burst` → `combat.apply_hp_cost_burst`.
- `immortal_aperture_progress` → `cultivation.apply_immortal_aperture_progress`.
- `inventory_slots` → `equipment.apply_inventory_slots`.
- `law_resonance` → `equipment.apply_law_resonance`.
- `lifespan_add` → `cultivation.apply_lifespan_add`.
- `lore_key` → `ending.apply_lore_key`.
- `major_preparation_progress` → `cultivation.apply_major_preparation_progress`.
- `passive_potency` → `equipment.apply_passive_potency`.
- `pill_potency` → `hazard.apply_pill_potency`.
- `pity_add` → `cultivation.apply_pity_add`.
- `plant_input` → `item_resource.apply_plant_input`.
- `purity_redistribute` → `cultivation.apply_purity_redistribute`.
- `recipe_input` → `item_resource.apply_recipe_input`.
- `recipe_or_quest_input` → `item_resource.apply_recipe_or_quest_input`.
- `resist_percent` → `equipment.apply_resist_percent`.
- `root_mutation_trial` → `cultivation.apply_root_mutation_trial`.
- `shield_hp` → `combat.apply_shield_hp`.
- `skill_damage_percent` → `equipment.apply_skill_damage_percent`.
- `social_gift_input` → `item_resource.apply_social_gift_input`.
- `stance_switch` → `combat.apply_stance_switch`.
- `stat_percent` → `combat.apply_stat_percent`.
- `survive_lethal` → `combat.apply_survive_lethal`.
- `talisman_input` → `item_resource.apply_talisman_input`.
- `trap_detect` → `equipment.apply_trap_detect`.

Giới hạn: tu luyện không vượt99% hoặc tự đột phá; lifespan không kéo lại đời đã chết; stat gốc cộng trong cap40 của kiếp, không phải stat TM tài khoản; purity redistribution bảo toàn tổng; root trial chỉ xem trước cho tới confirm; hazard block không biến thất bại độ kiếp thành bất tử; trí nhớ chỉ giữ theo whitelist; resource input không gọi item-use API trực tiếp.
