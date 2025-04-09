class Hero:
    def __init__(self, name, level, heroType):
        self.name = name
        self.level = level
        self.heroType = heroType

    def heroAttrubutes(self):
        print(self.name, ":")
        print("level:", self.level)
        print("class:", self.heroType)


class Warrior(Hero):
    def __init__(self, name, level, heroType, strength):
        super().__init__(name, level, heroType)
        self.strength = strength

    def heroAttrubutes(self):
        super().heroAttrubutes()
        print("strength:", self.strength)


paladin = Hero("Rodrick", 9, "Paladin")
paladin.heroAttrubutes()

guerrero = Warrior("Astorias", 33, "Warrior", 45)
guerrero.heroAttrubutes()