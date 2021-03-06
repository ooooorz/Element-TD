-- Polar (Earth + Light + Water)
-- This is a support tower. It has a splash attack. It has an autocast single target ability that buffs creeps. 
-- When a creep is buffed it will immediately lose X% of it's current HP.  It will gain it back X seconds later

PolarTower = createClass({
        tower = nil,
        towerClass = "",

        constructor = function(self, tower, towerClass)
            self.tower = tower
            self.towerClass = towerClass or self.towerClass
        end
    },
    {
        className = "PolarTower"
    },
nil)

function PolarTower:FrostbiteThink()
    if self.ability:IsFullyCastable() and self.ability:GetAutoCastState() then
        -- let's find a target to autocast on
        local creeps = GetCreepsInArea(self.tower:GetOrigin(), self.ability:GetCastRange())
        local highestHealth = 0
        local theChosenOne = nil

        for _, creep in pairs(creeps) do
            if creep:IsAlive() and not creep:HasModifier("modifier_polar_frostbite") and creep:GetHealth() > highestHealth and not creep:IsInvulnerable() then
                highestHealth = creep:GetHealth()
                theChosenOne = creep
            end
        end

        if theChosenOne then
            self.tower:CastAbilityOnTarget(theChosenOne, self.ability, self.tower:GetPlayerOwnerID())
        end
    end
end

function PolarTower:OnFrostbiteCast(keys)
    local target = keys.target
    if target:HasModifier("modifier_polar_frostbite") then
        ShowWarnMessage(self.tower:GetPlayerOwnerID(), "#polar_tower_frostbite_error")
        self.ability:EndCooldown()
    else
        self.ability:ApplyDataDrivenModifier(self.tower, target, "modifier_polar_frostbite", {})
        local healthBurnAmount = math.floor(target:GetHealth() * (self.healthBurnPercent / 100))
        target:SetHealth(target:GetHealth() - healthBurnAmount)
        target.FrostbiteData = {
            ["HealthBurnAmount"] = healthBurnAmount,
            ["ResultingHealth"] = target:GetHealth(),
        }

        local playerID = self.tower:GetPlayerOwnerID()
        self.tower:EmitSound("Polar.Cast")

        local particle = ParticleManager:CreateParticle("particles/units/heroes/hero_lich/lich_frost_nova_flash_d.vpcf", PATTACH_ABSORIGIN, target)
        ParticleManager:SetParticleControl(particle, 0, target:GetOrigin() + Vector(0, 0, 40))
        ParticleManager:ReleaseParticleIndex(particle)
    end

    -- No cooldown sandbox option
    if GetPlayerData(self.tower:GetPlayerOwnerID()).noCD then
        self.ability:EndCooldown()
    end
end

function PolarTower:OnAttackLanded(keys)
    local target = keys.target
    local damage = self.tower:GetAverageTrueAttackDamage()
    DamageEntitiesInArea(target:GetOrigin(), self.halfAOE, self.tower, damage / 2)
    DamageEntitiesInArea(target:GetOrigin(), self.fullAOE, self.tower, damage / 2)
end

function PolarTower:OnBuildingFinished()
    Timers:CreateTimer(function()
        if IsValidEntity(self.tower) then
            self:FrostbiteThink()
            return 0.1
        end
    end)
end

function PolarTower:OnCreated()
    self.ability = AddAbility(self.tower, "polar_tower_frostbite", self.tower:GetLevel())
    self.ability:ToggleAutoCast()
    
    self.fullAOE =  tonumber(GetUnitKeyValue(self.towerClass, "AOE_Full"))
    self.halfAOE =  tonumber(GetUnitKeyValue(self.towerClass, "AOE_Half"))

    self.healthBurnPercent = GetAbilitySpecialValue("polar_tower_frostbite", "health_burn")[self.tower:GetLevel()]
    self.abilityCastRange = GetAbilityKeyValue("polar_tower_frostbite", "AbilityCastRange")
end

function OnFrostbiteExpire(keys)
    local target = keys.target
    if target.FrostbiteData and target:IsAlive() then
        local healAmount = target.FrostbiteData.HealthBurnAmount
        target:SetHealth(target:GetHealth() + healAmount)
        target.FrostbiteData = nil
    end
end

RegisterTowerClass(PolarTower, PolarTower.className)