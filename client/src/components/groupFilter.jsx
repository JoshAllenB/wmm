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

const GroupFilter = ({ groups, selectedGroup, setSelectedGroup, setPage }) => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className="flex items-center gap-2 bg-gray-100"
        >
          {selectedGroup ? `Group: ${selectedGroup}` : "Filter"}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-64">
        <DropdownMenuLabel>Filters</DropdownMenuLabel>
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
              {groups.map((group) => (
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
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
export default GroupFilter;
