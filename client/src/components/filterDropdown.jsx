import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuSeparator,
} from "./UI/ShadCN/dropdown-menu";
import { Button } from "./UI/ShadCN/button";
import { ScrollArea } from "./UI/ShadCN/scroll-area";
import { useUser } from "../utils/Hooks/userProvider";

const FilterDropdown = ({
  groups = [],
  selectedGroup,
  setSelectedGroup,
  setPage,
}) => {
  const { hasRole } = useUser();

  const getButtonText = () => {
    if (hasRole("WMM")) {
      return selectedGroup ? `Group: ${selectedGroup}` : "Filter";
    } else if (hasRole("HRG, FOM, CAL")) {
      return "Filter";
    }
  };
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className="flex items-center gap-2 bg-gray-100"
        >
          {getButtonText()}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-64">
        <DropdownMenuLabel>Filters</DropdownMenuLabel>
        <DropdownMenuSeparator className="border border-gray-900" />

        {hasRole("WMM") ? (
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              {selectedGroup ? `Group: ${selectedGroup}` : "Groups"}
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <ScrollArea className="h-72">
                <DropdownMenuItem
                  onClick={() => {
                    setSelectedGroup("");
                    setPage(1);
                  }}
                  className={!selectedGroup ? "bg-accent" : ""}
                >
                  All Groups
                </DropdownMenuItem>
                {Array.isArray(groups) &&
                  groups.map((group) => (
                    <DropdownMenuItem
                      key={group._id}
                      onClick={() => {
                        setSelectedGroup(group.id);
                        setPage(1);
                      }}
                      className={selectedGroup === group.id ? "bg-accent" : ""}
                    >
                      {group.id}
                    </DropdownMenuItem>
                  ))}
              </ScrollArea>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        ) : (
          <DropdownMenuItem disabled>
            Group filtering not available for your role
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
export default FilterDropdown;
